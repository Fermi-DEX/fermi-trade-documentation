# 02 · Architecture

This page explains how Fermi-v1 is built, what each component does,
how they interact, and why the design delivers something that is
usually a trade-off: **a fair, fully on-chain order book that still
feels as fast as a centralized exchange.**

It is written for two audiences at once — engineers who need the
mental model before reading the mechanics chapters, and evaluators
(prospective large users, market makers etc.) who
need to judge whether the system is sound and viable.

## The problem Fermi-v1 solves

A perpetual-futures exchange has to do four things well:

1. **Match orders fairly** — earlier orders should get filled
   first, and nobody should be able to jump the queue or
   front-run.
2. **Settle trustlessly** — users should never have to hand
   custody of funds to an operator.
3. **Feel fast** — traders expect millisecond feedback, not
   block-time feedback.
4. **Stay live** — the exchange should keep working even when
   individual off-chain services fail or misbehave.

On-chain order books usually get (1) and (2) but fail (3): every
action waits for block confirmation. Centralized exchanges get (3)
but fail (1) and (2): you trust the operator's matching engine and
custody. Fermi-v1 is architected so you do not have to choose.

## The four components

```
        ┌───────────────────────────────────────────────────────────┐
        │                  Trader (wallet / SDK / UI / bot)          │
        └───┬───────────────────────┬──────────────────────┬─────────┘
            │ 1. sign + submit      │ 4. read state        │ 5. stream
            │    signed intent      │    (optimistic +     │    fills /
            ▼                       │     confirmed)       │    events
   ┌─────────────────┐              │                      │
   │   RELAYER        │             ▼                      ▼
   │  (off-chain      │     ┌──────────────────┐   ┌────────────────┐
   │   sequencer)     │     │ CONTINUUM HARNESS │   │    FANOUT       │
   │                  │     │ (off-chain read / │   │ (SSE broadcast) │
   │ - validate       │     │  optimistic layer)│   │                 │
   │ - assign seq     │     └────────▲──────────┘   └───────▲────────┘
   │ - commit hash    │              │ reads               │ events
   └────────┬─────────┘              │                      │
            │ 2. commit              │                      │
            │    + 3. reveal         │                      │
            ▼                        │                      │
   ┌──────────────────────────────────────────────────────────────────┐
   │              FERMI-V1 ON-CHAIN SETTLEMENT PROGRAM                  │
   │                                                                    │
   │   ExecutionQueueV5  →  matching engine  →  risk engine            │
   │   (FCFS sequencing)    (FIFO order book)   (cross-margin health)  │
   │                                                                    │
   │   Group · Bank · FermiAccount · PerpMarket · BookSide · EventQueue │
   └──────────────────────────────────────────────────────────────────┘
                  ▲                                       │
                  │ 6. EXECUTOR drives reveal/execute      │ events
                  └───────────────────────────────────────┘
                              Solana mainnet-beta
```

### 1. The on-chain settlement program

This is the **only authority**. It is a Solana program that owns:

- The **execution queue** (`ExecutionQueueV5`) — a per-market,
  first-come-first-served sequencer.
- The **matching engine** — a price-time-priority FIFO order book.
- The **risk engine** — cross-margin health, funding, liquidation,
  bankruptcy resolution.
- All **value-bearing state** — `Group`, `Bank` (collateral),
  `FermiAccount` (your positions), `PerpMarket`, `BookSide`,
  `EventQueue`.

Every fill, every funding payment, every liquidation happens here,
in a transaction recorded on the public ledger. Nothing off-chain
can move your funds, change a fill, or reorder a trade. The
off-chain components exist purely to make the on-chain program
**fast to use** and **fast to observe** — they have no special
powers.

This is the bedrock of the trust model: if every off-chain
component disappeared tomorrow, your funds would be exactly where
the chain says they are, and you could still interact with the
program directly (see [21 - Direct Fallback Pool](21-direct-fallback.md)).

### 2. The relayer (off-chain sequencer)

The relayer is a stateless service that turns a trader's signed
order into an on-chain queue entry. Per order it:

1. **Receives** a signed *intent* — the order payload plus the
   trader's Ed25519 signature plus the exact account list the
   order will touch.
2. **Validates** off-chain: signature correctness, account
   freshness, oracle freshness, margin/health pre-check,
   reduce-only rules. This is a courtesy fast-fail — it spares the
   trader a wasted on-chain transaction — not a security boundary.
3. **Assigns a sequence number** for that market. Sequence numbers
   are strictly increasing and gap-free per market.
4. **Commits** a *hash* of the intent to the on-chain queue,
   batched with up to 64 other commits for efficiency.
5. **Returns** the assigned sequence and the commit transaction
   signature to the trader, immediately.

The relayer is **trusted-but-verifiable**. It decides the order in
which it commits intents — but once it commits, the sequence and a
hash of the payload are locked on chain. It **cannot**:

- Change your order's contents after you signed it — the reveal
  step re-hashes the payload and checks your signature.
- Reorder same-market intents after committing — the sequence is
  on chain.
- Substitute account lists — the account list is bound into the
  signed intent.
- Replay your order — the on-chain replay cache rejects duplicate
  intent hashes.
- Move your funds — every state change requires your signature,
  verified inside the program.

The worst a malicious or broken relayer can do is **refuse to
sequence you** — and even that is handled, by the direct fallback
pool (component note below).

### 3. The executor (off-chain crank)

A committed intent is just a hash on chain; it has not executed
yet. The **executor** is the off-chain worker that finishes the
job. It:

1. Picks up committed intents in sequence order.
2. Builds a **reveal** transaction containing the full intent
   payload and account list.
3. Submits it. The on-chain program then re-hashes the payload,
   verifies it matches the commit, verifies the trader's
   signature, checks the replay cache, and **dispatches the order
   into the matching engine**.
4. Advances the queue head so the next sequence can execute.

The executor is also **unprivileged**. If it builds a wrong reveal,
the hash check fails and the transaction reverts. If it stalls, a
watchdog ("autodrop") advances the queue past the stuck item so a
single failure cannot wedge a market. Anyone can run an executor;
in production the operator runs the relayer and executor together
in one service for low latency.

> Commit/reveal in one sentence: the relayer **locks the order
> (sequence + hash)** first, and the executor **opens it
> (payload)** second. Locking before opening is what makes the
> ordering provably fair — see "Why commit/reveal" below.

### 4. The Continuum harness (optimistic read layer)

The harness is the component that makes Fermi-v1 *feel* fast. It is
an off-chain service that maintains a continuously-updated mirror
of all on-chain state — every order book, every account, every
oracle — and serves it over plain HTTP and Server-Sent Events.

Crucially, the harness publishes **two views**:

- **Confirmed view** — state derived purely from finalized
  on-chain transactions. This is ground truth; it is what you
  settle and reconcile against.
- **Optimistic view** — the confirmed view *plus* the intents the
  relayer has already accepted but which have not yet been
  finalized on chain. Because the matching engine is deterministic
  and the harness can replay an accepted intent against its
  mirror, the optimistic view predicts the on-chain outcome
  **before the block lands**.

The optimistic view is what gives a trader sub-second feedback:
"your order is sequenced at position N and, against the current
book, it fills 1.4 SOL at \$150.2." Confirmation follows a beat
later and — because the same deterministic matcher runs in both
places — matches the prediction.

The **fanout** service sits in front of the harness's event stream
and re-broadcasts it to many subscribers at once, so thousands of
traders and bots can stream fills without overloading the core
harness. It is purely a scaling layer.

Like the relayer and executor, the harness has **no authority**.
It cannot change state; it can only read and predict it. A wrong
harness can mislead a UI for a moment, but the on-chain program
will not honor anything the harness says — it only honors signed,
sequenced, revealed intents.

## How a trade flows through all four

```
  t0   Trader signs an intent (order + signature + account list).
  t0   SDK sends it to the RELAYER.
  t0+  Relayer validates, assigns sequence 4711, COMMITS the hash.
       → Relayer returns (seq 4711, commit tx sig) to the trader.
       → Harness sees the accepted intent and updates the
         OPTIMISTIC view: the trader's UI shows the (predicted) fill
         in well under a second.
  t1   EXECUTOR builds the REVEAL for seq 4711 and submits it.
  t1   On-chain program re-hashes payload, checks signature, checks
       replay cache, DISPATCHES into the matching engine.
       → Order matches; FillEvent written; queue head advances.
  t2   Fill is finalized on chain. Harness CONFIRMED view now
       matches what the optimistic view already showed.
       → Fanout broadcasts the FillEvent over SSE.
```

The trader experiences `t0+` — milliseconds. The chain reaches
finality at `t2` — a second or two later. The gap between them is
bridged by the optimistic view, and it is *safe* to bridge because
the prediction is made by the same deterministic matcher that the
chain will run.

## Why commit/reveal — the fairness mechanism

The execution queue uses a two-step **commit then reveal** protocol.
The relayer first commits only a *hash* of the intent and its
sequence number; the full payload is revealed later by the
executor. This ordering — lock first, open second — is what makes
Fermi-v1's fairness *provable* rather than merely *promised*:

- **First-come-first-served (FCFS) is enforced, not trusted.**
  Each market has one monotonically increasing sequence. Orders
  execute in sequence order, period. The relayer chooses the
  sequence at commit time and the choice is immediately public and
  immutable. There is no room for a privileged actor to slip an
  order in front of yours after seeing it.
- **No payload-based reordering.** When the relayer commits, it
  only publishes a hash. Nobody — not the relayer, not a
  validator, not another trader — can see *what* your order is
  until it is already locked into its sequence position. So
  ordering cannot be influenced by order contents. This neutralizes
  the most common on-chain MEV: reordering a block to extract value
  from pending trades.
- **No tampering.** At reveal, the program recomputes the hash from
  the payload and account list. Any change — price, size, account,
  a single bit — produces a different hash and the transaction
  reverts.
- **No replay.** Each consumed intent hash is recorded in an
  on-chain cache. A signed order cannot be fired twice.
- **No silent drops.** Every stage of an intent emits a structured,
  queryable event. Given `(market, sequence)` you can ask the
  harness exactly where an order is and why — accepted, committed,
  revealed, executed, or dropped, with the reason.

The result is an order book where **time priority is a property of
the protocol**, the same way it is on a traditional exchange's
matching engine — except here it is publicly verifiable and nobody
has to be trusted to honor it.

## Why this combination is powerful

Taken together, the four components give Fermi-v1 a profile that is
hard to get any other way:

| Property | How the architecture delivers it |
|---|---|
| **Fair ordering (FCFS)** | One on-chain sequence per market; commit-before-reveal hides payloads until ordering is locked. |
| **Low perceived latency** | The optimistic harness predicts fills from accepted intents in milliseconds; deterministic matching guarantees the prediction holds. |
| **Trustless settlement** | The on-chain program is the sole authority; off-chain components have zero custody and zero ordering power post-commit. |
| **Censorship resistance** | If the relayer won't sequence you, the direct fallback pool lets you enter the queue on chain yourself. |
| **Throughput** | Per-market queues are independent, so markets commit and execute in parallel; commits are batched up to 64 at a time. |
| **Capital efficiency** | A single cross-margin `FermiAccount` backs positions across every market; collateral is not fragmented per market. |
| **Operational transparency** | Every intent leaves an auditable trail; `GET /trace/sequence/{market}/{seq}` answers "where is my order" in seconds. |
| **Verifiability** | Matching engine, risk engine, and queue are open-source on-chain code; anyone can audit or re-derive every fill. |

The headline is the pairing of the last two rows of the trade-flow
diagram: **FCFS fairness from the on-chain queue, plus
centralized-exchange-like responsiveness from the optimistic
harness.** On-chain books are usually fair but slow to interact
with; centralized books are fast but require trust. Fermi-v1's
separation of concerns — authority on chain, sequencing in a
verifiable queue, speed in a powerless read layer — is what lets it
offer both at once.

## The trust model, stated plainly

For an evaluator, the single most important question is "what can
each party do to me?" The answer:

| Party | Can do | Cannot do |
|---|---|---|
| **On-chain program** | Everything — it is the authority. It is open-source and audited; its behavior is fixed by deployed bytecode. | Act outside its code. Upgrades are governance-gated. |
| **Relayer** | Choose which order to commit; refuse service. | Alter, reorder-after-commit, replay, or forge your orders; touch your funds. |
| **Executor** | Drive reveals; choose timing. | Change payloads (hash check); wedge a market (autodrop watchdog); move funds. |
| **Harness / fanout** | Read and predict state; serve it fast. | Change any state; force the program to honor a prediction. |
| **Another trader / validator** | Submit their own orders; build blocks. | See your order contents before sequencing; reorder same-market intents; front-run committed flow. |
| **You** | Sign and submit your own intents; withdraw your own funds; liquidate undercollateralized accounts. | Affect anyone else's account without their signature. |

Every off-chain component is **replaceable and unprivileged**. The
operator runs them for convenience and speed; a sufficiently
motivated trader can run their own, or bypass them entirely via the
direct path. That is the property that makes the "feels like a CEX"
speed safe to rely on: the speed layer cannot betray you, because
it has nothing to betray you *with*.

## Liveness — what happens when things fail

| Failure | Effect | Mitigation |
|---|---|---|
| Relayer down | New orders can't take the fast path. | Direct fallback pool: submit intents on chain yourself. Cancels can also be sent as plain on-chain instructions. |
| Executor down | Committed intents don't reveal. | Any party can run an executor; the autodrop watchdog advances past stalled items. |
| Harness down | Optimistic reads unavailable. | Read confirmed state directly from any Solana RPC; trading is unaffected. |
| Fanout down | Event streaming degraded. | Subscribe to the harness directly, or poll. |
| Oracle stale | Affected market pauses (reads revert). | Anyone can push a fresh oracle update; other markets unaffected. |
| Solana congestion | Higher confirmation latency. | Optimistic view still serves; priority fees; per-market isolation. |

No single off-chain failure can cause loss of funds or loss of
fair ordering. The worst case is degraded latency or a temporary
inability to *enter* new orders via the fast path — and even then
the direct on-chain path remains open.

## Where to read more

- [10 - FIFO Order Book](10-fifo-orderbook.md) and
  [11 - Matching Engine](11-matching-engine.md) — the on-chain
  matcher in detail.
- [15 - Margin & Health](15-margin-and-health.md) — the cross-margin
  risk engine.
- [20 - Execution Queue v5](20-execution-queue.md) — the commit/
  reveal queue, sequencing, and recovery, with on-chain data
  structures.
- [21 - Direct Fallback Pool](21-direct-fallback.md) — the
  censorship-resistant submission path.
- [25 - HTTP & SSE API](25-api-http.md) and
  [26 - gRPC API](26-api-grpc.md) — the harness and relayer
  interfaces.
