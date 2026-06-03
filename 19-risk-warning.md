# 18 · Risk Warning

Trading perpetual futures is high-risk. Read this page carefully.

## You can lose more than you think

Perp trading uses leverage. A 5 % adverse move on a 10× position
wipes out 50 % of your collateral in that account. Your entire
collateral can be wiped out in seconds during fast markets.

You may also lose **more than the position you opened**: if the
market gaps through your stop-loss before any matcher pass runs, you
will be liquidated at the post-gap price, not at your stop. The
liquidation discount, platform fee, and any insurance/socialization
events apply on top of the price loss.

## Operational risks specific to Fermi

These are above and beyond market risk:

### Oracle pause / staleness

If the Pyth (or Switchboard) feed for a market goes stale beyond
`max_staleness_slots`, **every read against that oracle reverts**.
Symptoms:

- You can't place new orders on that market until the feed comes
  back.
- You can't be liquidated on that market either, but you also can't
  *close* yourself.
- Funding for that market freezes (no funding accrual until the
  next successful `update_funding`).

Pyth pull updates can be triggered by anyone. If your bot stalls
because of staleness, push a fresh price update yourself.

### Relayer outage

If the relayer is down, your intents can't be sequenced via the
fast path. You can still:

- Submit through the **direct fallback pool** (see
  [21 - Direct Fallback Pool](21-direct-fallback.md)) — your intent
  is staged on chain and the on-chain executor will admit it after
  the speed-bump.
- Use the on-chain `perp_cancel_*` instructions directly with
  Anchor — these don't go through the queue at all (they're admin-
  free instructions that operate on the orderbook directly).

### Solana congestion

Solana periodically experiences periods of high congestion. During
these, transactions may not land for tens of seconds. Implications:

- Settle PnL bonuses are highly competitive and may take retries.
- Liquidation racing is competitive; the first to land wins. If
  you're a liquidator bot, use priority fees.
- A user's `cancel` may not land in time. Always assume the order
  could fill before your cancel does.

### Stable-price drag

When the oracle moves quickly, your `init_health` lags because the
stable price hasn't caught up. This is **protective for the system**
but means your effective borrowing power is reduced during volatile
moves. Plan accordingly: don't compute "max position" off the
oracle alone.

## Self-trade and replay protection

Self-trade prevention modes do exactly what they say. If you set
`AbortTransaction` and your bot accidentally collides with its own
order, the entire intent fails — and a slot in the v5 queue is
burned. Use `CancelProvide` if you want a never-fail replace flow.

The on-chain replay cache rejects identical intents within `~10`
slots / `512` entries. If you replay a signed intent quickly, the
second submission gets `ExecutionQueueV5IntentReplay`. Sign a fresh
intent (with new nonce / `client_order_id`) for each retry.

## What the protocol does **not** protect you from

- Bugs in your own off-chain code (wrong size, wrong direction,
  wrong account).
- Wallet compromise or signing-key theft.
- RPC outages / bad blockhashes.
- Loss of access to your authority keypair.
- Off-protocol scams (social engineering, fake "Fermi" sites, etc.).

## What the protocol **does** protect you from

- A malicious v1 sequencer/relayer can't silently reorder your
  transactions relative to the emitted
  [POSq order](30-posq-sequencing.md) — encrypted VDF ticks, the
  commitment trail, and on-chain queue commits make reordering
  detectable.
- A malicious relayer can't substitute account lists — the canonical
  user-intent message (`canonical_user_intent_message_v2`,
  `instructions/execution_queue_v5.rs:671-682`) binds the account
  list into the user's signature.
- A replayed signature can't fire your order twice — the on-chain
  replay cache catches it.
- The relayer can't take custody of your funds — every state-
  modifying instruction requires *your* (or your delegate's)
  signature, verified inside the on-chain program.
- The matcher can't fill you at a worse price than `max_quote_lots`
  caps — set both base and quote caps for hard slippage limits.

## Recovery paths

If you find yourself unable to act on the system:

1. **Check the trace endpoint.** `/trace/sequence/{market}/{seq}`
   reports every stage of an intent (or absence of it). Most "lost
   orders" turn out to be intents that never reached the POSq/relayer
   fast path.
2. **Use direct submission.** Bypasses the fast path entirely for
   cancellation / close-only flows.
3. **Use the Anchor IDL directly.** All `perp_cancel_*`,
   `token_withdraw`, etc. are direct on-chain instructions you can
   sign and submit yourself with no execution queue at all.
4. **Reach out to support.** See [29 - Support](29-support.md).

## Jurisdictional note

Fermi is open-source software deployed to a public blockchain. Use
of perpetual futures may be restricted in your jurisdiction. Operators
of front-end UIs are responsible for restricting access where
required by law; the on-chain program is permissionless.

If you're unsure whether you're allowed to trade perps where you
live, **don't trade until you've checked**. The protocol cannot
return funds based on jurisdiction-after-the-fact.
