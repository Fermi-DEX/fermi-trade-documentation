# 03 · Glossary

Every term used elsewhere in these docs.

### A
- **AbortTransaction** — A self-trade behavior that fails the entire
  transaction if the new order would match an existing order from the
  same Fermi account.
- **Admission window** — The range of sequence numbers a relayer can
  commit at any time: `[next_sequence_to_execute,
  next_sequence_to_execute + admission_limit)`. Default
  `admission_limit` = 1024 (the per-market ring capacity).
- **ADL** — Auto-de-leveraging. Fermi does **not** use ADL; losses
  are absorbed by the insurance fund and then socialized as
  unsocialized loss across all account deposits.
- **Asks** — Sell-side order book; lower price first.

### B
- **Base** — The asset being traded; for `SOL-PERP`, the base is SOL.
- **Bank** — Per-token state account holding deposit/borrow indexes,
  weights, fees, and oracle ref. Source of truth for spot collateral.
- **Bids** — Buy-side order book; higher price first.
- **BookSide** — One side (bids or asks) of a perp market. Each
  side contains *two* trees: `Fixed` (absolute price) and
  `OraclePegged` (offset from oracle). Both are price-time ordered.
- **Bump** — PDA bump seed.

### C
- **Cancel** — Removes an order from the book without a fill. Frees
  the trader's `bids_base_lots`/`asks_base_lots` reserve.
- **CancelProvide** — Self-trade behavior: cancel the resting (own)
  order rather than match it.
- **Client order ID** — Optional, user-supplied 64-bit integer that
  echoes back on fill events. Useful for idempotent replace flows.
- **Commit** — On-chain write of an intent's hash to the v5 queue.
  Locks in the sequence; the payload comes later in the reveal.
- **CommitItemV5** — The 96-byte ring-buffer entry storing one
  committed intent: hash, sequence, ingress slot, expiry, status, retries.
- **Confirmed view** — Optimistic harness state derived only from
  on-chain confirmed transactions. Safe to reconcile against.
- **Optimistic harness** — Off-chain read / optimistic layer that
  publishes optimistic and confirmed views of the orderbook +
  accounts. Has no authority over execution. See
  [02 - Architecture](02-architecture.md).
- **CTM** — Cooperative Transaction Model. Users sign intents; POSq
  sequences encrypted intents over VDF ticks; the relayer commits the
  resulting sequence to the on-chain queue.

### D
- **DecrementTake** — Self-trade behavior: matching against your own
  order is allowed, but neither side pays fees.
- **Delegate** — A second pubkey allowed to sign orders for a Fermi
  account. Cannot withdraw or close.
- **Deposit index** — Bank-wide compounding factor; multiplied by an
  account's indexed balance to get native deposit amount.
- **Direct pool** — A separate per-market staging area for
  user-submitted intents that bypass the relayer (censorship
  fallback). Has a fixed slot speed-bump.
- **Dispatch** — On-chain step that calls the Fermi handler for the
  revealed intent (e.g. `perp_place_order`).

### E
- **EventQueue** — Per-perp-market ring buffer of `FillEvent` and
  `OutEvent`. Drained by `perp_consume_events` (max 8 per call).
  Capacity = `488` events.
- **Executor** — The off-chain worker that picks up committed
  intents in sequence order, builds reveal transactions, and lands
  them on chain. Unprivileged: a wrong reveal fails the on-chain
  hash check. See [02 - Architecture](02-architecture.md).
- **Expires_at_slot** — On-chain slot beyond which a committed intent
  must not execute. Enforced at reveal time.

### F
- **Fanout** — `:9094` HTTP/SSE service that re-broadcasts executor
  events to many concurrent subscribers.
- **FCFS** — First-come-first-served. The execution queue assigns
  each market a single increasing sequence and executes in that
  order; commit-before-reveal hides order contents until the
  sequence is locked, so ordering cannot be gamed. See
  [02 - Architecture](02-architecture.md).
- **Fermi account** — Per-user account holding token balances, perp
  positions, perp open orders, and serum/openbook open-orders
  references. A PDA owned by the trader's wallet; cross-margined.
- **FIFO** — First-in-first-out. Within a single price level, the
  earliest order placed has priority.
- **FillEvent** — Generated when two orders match. Contains taker,
  maker, price, quantity, fees, timestamps. Drained by
  `perp_consume_events`.
- **Fixed price order** — Limit order with an absolute price, stored
  in the `Fixed` tree.
- **Force close** — Admin-triggered close of a stuck position at
  oracle price; only when market `force_close == 1`.
- **Funding** — Periodic payment from longs to shorts (or vice versa)
  to peg perp price to oracle. See [09 - Funding](09-funding.md).

### G
- **Gap** — A revealed sequence is missing at the head; the queue
  cannot advance until the gap fills or `gap_wait_slots` elapses
  (default 4 slots).
- **Group** — Top-level account binding a set of banks and perp
  markets to one collateral universe. Fermi has one mainnet group.

### H
- **Health** — Signed USD value of an account; positive = solvent.
  Three flavors: `init`, `maint`, `liquidation_end`.
- **hupnl** — Health unsettled PnL. The risk-weighted form of perp
  unsettled PnL that flows into the health computation.

### I
- **Impact price** — The mid-market price obtained by sweeping
  `impact_quantity` lots into the book; used to compute the funding
  rate.
- **Indexed balance** — Account-side store of token balances; expand
  to native via `balance × index`.
- **IntentHash** — 32-byte SHA-256 of the canonical user-intent
  message; tracked in the on-chain `replay_cache` for 10 slots.
- **Init health** — The strictest health flavor; required `≥ 0` to
  open new exposure.
- **IOC** — Immediate-or-Cancel. Match what's available, never post
  the remainder.
- **Insurance fund** — A USDC vault held by the group; covers
  bankrupt-account liabilities before socialization.
- **Isolated margin** — Not supported by Fermi; all exposure is
  cross-margined within a Fermi account.

### L
- **LeafNode** — One order in the book tree. Holds owner, quantity,
  timestamp, TIF, peg_limit, client_order_id.
- **Limit order** — Posts at a fixed price; rests in the book if
  not crossable.
- **Liquidation** — Anyone may liquidate an account where
  `maint_health < 0`. Two phases: base-or-positive-PnL, then
  negative-PnL-or-bankruptcy.
- **Liquidation end health** — The threshold a liquidatable account
  must reach to exit liquidation: `liq_end_health ≥ 0`. Uses init
  weights with oracle prices.
- **Lot** — The smallest tradable unit of base or quote in a market.
  Base lots and quote lots are independent.

### M
- **Maint health** — The liquidation trigger; if `< 0`, anyone can
  liquidate.
- **Mark price** — The price used for unrealized-PnL and health
  computation; the **oracle price** for `maint`/`liquidation_end`,
  and the wider **stable-price band** for `init`.
- **Maker fee** — Fee paid by (or rebate to) the resting side of a
  trade. May be negative (rebate). Stored as `I80F48`.
- **Maker order** — Order resting on the book at the time of match.

### N
- **Native** — Smallest token unit. USDC native = `0.000001 USDC`.
- **next_sequence_to_execute** — Per sub-queue head sequence; the
  next sequence the executor must process.

### O
- **Open interest** — Sum of absolute base lots across all longs
  (= sum of absolute base lots across all shorts).
- **Optimistic view** — Optimistic harness state = confirmed view +
  relayer-accepted intents not yet finalized on chain. Predicts the
  on-chain outcome in milliseconds; safe because the matcher is
  deterministic. Contrast **Confirmed view**.
- **OraclePegged order** — Limit order whose price is `oracle_price +
  offset_lots`. Stored in the `OraclePegged` tree. Has a `peg_limit`
  ceiling/floor and a `max_oracle_staleness_slots` validity window.
- **OutEvent** — Generated when an order is removed from the book
  (cancel, expiry, eviction). Drained by `perp_consume_events`.

### P
- **PerpMarket** — Per-market account holding lot sizes, fees,
  funding state, weights, oracle ref, BookSide and EventQueue
  pubkeys.
- **PerpOpenOrder** — One slot in your account tracking a single
  resting perp order.
- **Platform fee** — A second cut of liquidation fees that goes to
  the group owner (not the liquidator).
- **PostOnly** — Order type that fails if it would take liquidity.
- **PostOnlySlide** — Like PostOnly, but if it would cross, it's
  re-priced to one tick *behind* the best opposing price (so it
  always posts).
- **Price lots** — Integer price; native price =
  `price_lots × quote_lot_size / base_lot_size`.

### Q
- **Quote** — The settlement asset of a market; for `SOL-PERP` the
  quote is USD (settled in USDC).
- **quote_position_native** — On-account perp field; the running
  quote-side balance of a perp position before settlement.

### R
- **Reduce-only** — Order flag (or market mode) that disallows any
  trade that would *increase* absolute exposure.
- **POSq** — Fermi's verifiable sequencing scheme. In v1 it runs in
  single-sequencer mode, ordering encrypted transactions over VDF
  ticks so reordering is detectable. V2 is planned to add voting,
  leader rotation, and permissionless participation.
- **Relayer** — Off-chain gRPC service that accepts user intents,
  validates them, and commits POSq-ordered intent hashes to the
  on-chain v5 queue. It cannot alter, silently reorder an emitted POSq
  sequence, replay, or forge orders. See [02 - Architecture](02-architecture.md).
- **Replay cache** — On-chain ring of consumed `(intent_hash,
  consumed_slot)` pairs; rejects duplicate submissions for ~10 slots
  / 512 entries.
- **Reveal** — Second on-chain step where the executor provides the
  full intent payload, the program re-hashes and verifies, then
  dispatches.

### S
- **Self-trade** — A new order that would match against an existing
  order owned by the same Fermi account. See
  [13 - Self-Trade Prevention](13-self-trade-prevention.md).
- **Sequence** — Per-market monotonic order index assigned at commit
  time. Drives FIFO execution.
- **Settle** — `perp_settle_pnl` realizes the unsettled PnL between
  two opposite-sign accounts in the same perp market.
- **Settle health** — A health variant used by settlement to ensure
  the loser can absorb the loss without becoming insolvent.
- **Settle limit** — Per-window cap on PnL settlement. Configured
  via `settle_pnl_limit_factor` and
  `settle_pnl_limit_window_size_ts` (default 24h, factor 0.2).
- **Slot** — Solana validator round (~400 ms).
- **Stable price** — Filtered, growth-clamped reference price used
  for init-health risk bands; resists short-term oracle spikes.
- **Sub-queue** — One market's slot inside the v5 queue. Each market
  gets a `SubQueueHeaderV5` and a 1024-entry ring of items.

### T
- **Taker fee** — Fee paid by the order that crosses the book.
  Always non-negative.
- **TIF** — Time-in-force, in seconds from placement; `0` = no
  expiry. Expired orders are removed by the next matcher or
  `perp_consume_events`.
- **Trace** — Optimistic harness endpoint
  `/trace/sequence/{market}/{seq}` that lists every stage an intent
  passed through (and which it didn't).

### U
- **Unsettled PnL** — `quote_position_native +
  base_position_native × oracle_price`. Pure mark-to-market; not yet
  realized.
- **Unsocialized loss** — Bankruptcy loss that could not be
  absorbed even by socialization (because `open_interest == 0`).
  Tracked on `PerpMarket.unsocialized_loss`.

### W
- **Weight** — Discount applied to assets (`< 1`) or premium added
  to liabilities (`> 1`) when computing health.
- **Withdraw** — `token_withdraw` removes funds from a Fermi account
  if the post-withdraw `init_health ≥ 0`.
