# 27 · FAQ

### What is Fermi?

A non-custodial, on-chain perpetual-futures exchange on Solana.
Self-custody collateral, sign your own orders, execute every fill on
chain. See [01 - Overview](01-overview.md).

### How is Fermi different from a CEX perp?

- Your funds never leave your control.
- The matching engine runs in the on-chain program; nobody can
  pause / reroute / front-run your order.
- Order sequencing is hash-committed *before* the payload reveals,
  so validators can't reorder same-market intents undetected.

### How is Fermi different from other Solana perp DEXes?

- It uses a true central-limit order book on chain (not an AMM).
- Cross-margin across all markets in the group from a single
  `FermiAccount`.
- A per-market commit/reveal queue (v5) gives explicit FIFO
  guarantees and replay protection.
- Optimistic + confirmed dual-view state via the optimistic harness.

## Trading

### What happens if my order partially fills?

The matched portion fills against the resting opposing order(s).
The unmatched remainder either rests on the book (Limit /
OraclePegged), is dropped (Market / IOC), or bumps to the next
opposing tick (PostOnlySlide). You keep your `client_order_id`
across the partial — fill events tag it.

### Can I edit a resting order?

No edit-in-place; the canonical pattern is *cancel + replace*:

```ts
await client.perpCancelOrderByClientOrderId(group, account, perp, 42n);
await client.perpPlaceOrder(group, account, perp, { ...new params, clientOrderId: 43n });
```

If you set `selfTradeBehavior: 'cancel_provide'` on the new order,
you can even submit the new order *before* the cancel lands — the
matcher will cancel the old one when it would have collided.

### What if the market is moving very fast and my cancel doesn't land?

Possible. Solana congestion can hold txs for many seconds. Mitigations:

- Use **TIF** to auto-expire orders. `time_in_force = 5` means the
  order self-destructs in 5 seconds without needing a cancel tx.
- Use **`reduce_only`** on stops so an accidental fill never flips
  your position.
- Add **priority fees** to your relayer requests.
- For emergency closes, use the direct cancel CPI (no queue
  latency) or sign a plain Anchor `perp_cancel_*` tx.

### Why didn't my IOC fill?

Two common reasons:

- The price moved before reveal — the book at reveal time no longer
  satisfied your `price_lots` threshold.
- The book was empty on the opposing side at reveal time.

In both cases you still pay the `fee_penalty` (it's charged on
entry to `new_order`).

### Why was my PostOnly order rejected?

Because at reveal time it would have crossed. PostOnly is
all-or-nothing: if any portion is marketable, the entire order is
discarded with no fill and no rest. Use `PostOnlySlide` if you'd
rather have it post one tick away from the cross.

### How long does an order live by default?

Forever (`time_in_force = 0`). Set TIF for auto-expiry. Note
expiry is enforced lazily — the order is removed by the next
matcher pass that encounters it, or by `perp_consume_events`.

## Margin & PnL

### How much leverage can I use?

It depends on the market's `init_base_asset_weight` and your
collateral's `init_asset_weight`. A USDC-collateralized account
trading SOL-PERP with `init_base_asset_weight = 0.95` can take up
to ~20× leverage before init health goes negative. See
[15 - Margin & Health](15-margin-and-health.md).

### Why does my init health say one thing and maint health another?

Init health uses a wider price band (`stable_price` filtered) and
init weights, which are stricter. Maint health uses the raw
oracle and softer maint weights. The gap is your liquidation
buffer.

### Why is my "available collateral" smaller than my deposit?

Init weights discount your collateral (e.g. SOL might be valued at
85 % of oracle for init purposes), and any open orders / positions
are reserved against future worst-case fills. Your spot deposit
shows in the UI; available collateral shows what you can put to
work after weighting and reservations.

### When does PnL settle?

Whenever `perp_settle_pnl` is called against you and a counterparty.
In production the keeper service settles continuously, prioritizing
underwater accounts. You can also settle yourself any time via the
SDK.

### Can I be liquidated below my init health?

Yes. Init health is the "open new exposure" gate, not the
liquidation trigger. You're liquidatable only when **maint** health
goes below zero — but that can happen quickly if the market gaps.

### What happens if there isn't enough collateral to cover my loss?

You go through bankruptcy (see [18 - Bankruptcy](18-bankruptcy-insurance.md)).
The insurance fund covers the gap first; remainder is socialized
across depositors of the settle token (USDC). You don't owe any
"residual" debt — your liability is bounded by your account
collateral.

## Execution / queue

### How long between submitting an intent and it executing?

Typically sub-second when the network is healthy:

- Relayer admit: tens of ms.
- Commit landing on chain: 1-2 slots (~400-800 ms).
- Reveal/execute: 1-2 more slots.

So **~1-2 seconds** end-to-end is normal, faster on optimistic
view. The harness does not invent a provisional fill; it pre-plays the
committed sequence through the same deterministic AMQ-style queue and
matching logic the on-chain program will run.

### Can POSq / the relayer reorder my orders?

Within a market — not silently. In v1,
[POSq](30-posq-sequencing.md) runs in single-sequencer mode and orders
encrypted transactions over VDF ticks. The emitted POSq order, queue
commit, and reveal trail make reordering detectable, and the on-chain
AMQ-style queue enforces the committed sequence. Across markets, each
market has its own queue, so ordering is only defined per market.

### Can POSq / the relayer drop my order?

In v1, the single fast-path sequencer can refuse admission or be
unavailable before your intent enters the POSq log. Once accepted and
committed, it cannot make a silently accepted order disappear without an
audit trail — every stage emits a structured event you can query via the
`/trace/sequence/{market}/{seq}` endpoint.
[V2 POSq](30-posq-sequencing.md#v2-consensus-level-safeguards) is
planned to add voting, leader rotation, and permissionless participation
to reduce the remaining single-sequencer liveness/admission assumption.

### What is "autodrop"?

The off-chain watchdog that calls
`execution_queue_v5_reclaim_seq_market` when an intent is stuck at
the head past its timeout. Prevents a single lost reveal from
wedging a market.

### What if I want to bypass the relayer?

Use the direct fallback path —
[21 - Direct Fallback Pool](21-direct-fallback.md) — or sign plain
on-chain instructions (`perp_cancel_order`, etc.) yourself. The
trade-off is latency: direct submissions wait through a fixed
slot speed-bump.

## Oracles & funding

### Whose oracle does Fermi use?

Pyth and Switchboard are the standard sources for live markets.
Stub oracles are used for testing only. Each Bank and PerpMarket
binds to one oracle account.

### What happens if the oracle is stale?

Every read against that oracle reverts. You can't trade on that
market until the feed comes back. Anyone can push a Pyth update;
in practice the relayer + keeper services do.

### Where do I see the funding rate?

`PerpUpdateFundingLogV2` events on the SSE stream, or
`GET /trader/{authority}/funding-history`, or the trading UI's
funding panel.

### Why is funding paid continuously instead of every 8 hours?

Each `perp_update_funding` call accrues funding proportional to
elapsed time. There's no hourly snapshot; funding is smoothly
prorated. The on-chain code caps a single update interval at
1 hour to prevent compounding stale funding through a Solana
downtime.

## Operations

### Where is the source code?

The on-chain program lives at `programs/fermi-v1/` in the Fermi
repo. The relayer and executor live in `bin/`, and the optimistic
harness in `rust-harness/`. All components are open source so
anyone can audit the matching engine, risk engine, and queue logic.

### How do I report a bug or security issue?

See [29 - Support](29-support.md). For security, please use the
private disclosure channel rather than a public GitHub issue.

### Can I run my own relayer?

Yes — the relayer/executor binary is open source and is the same code
the operator runs. You'll need a funded Solana keypair to commit on
chain and a Pyth-friendly RPC. In v1,
[POSq production sequencing](30-posq-sequencing.md#v1-single-sequencer-posq)
is single-sequencer mode, so running your own relayer does not by itself
make you the sequencer. V2 is planned to add leader rotation and
permissionless participation.

### Can I run my own harness instance?

Yes — the harness is open source and exposes the same HTTP/SSE
surface as the hosted instance. Useful for low-latency strategies
that don't want to depend on a public endpoint. Because the harness
is purely a read/optimistic layer, running your own copy never
affects execution — the on-chain program remains the sole
authority. See [02 - Architecture](02-architecture.md).
