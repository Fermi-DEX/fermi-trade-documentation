# 10 · Matching Engine

The matching engine is the body of `Orderbook::new_order`
(`programs/fermi-v1/src/state/orderbook/book.rs:43-328`). It runs
during every `perp_place_order` instruction, before any of the
remainder is posted to the book.

This page traces what happens to your order, in order.

## Inputs

`new_order` receives:

- The decoded `Order` (side, max_base_lots, max_quote_lots,
  client_order_id, reduce_only, TIF, self_trade_behavior, params).
- A handle to both `BookSide` accounts and the `EventQueue`.
- The taker `FermiAccount`, the `PerpMarket`, current `oracle_price`,
  `now_ts`, `now_slot`.
- A `limit: u8` — max number of opposing orders to scan before
  bailing out (compute-budget protection).

## The pipeline

### Step 1 — IOC fee penalty

If the order's params are `Market` or `ImmediateOrCancel`, the market's
`fee_penalty` is debited from the taker immediately
(`book.rs:66-70`). This is independent of whether the order
fills or not.

### Step 2 — Initialize state

```
remaining_base_lots  = order.max_base_lots
remaining_quote_lots = order.max_quote_lots
limit                = order.limit
events_emitted       = 0
out_events_left      = 5         // cap on opportunistic OutEvents per call
```

### Step 3 — Walk the opposing book

Loop with these per-iteration steps (`book.rs:86-209`):

1. **Pull the next best opposing order** via the merge cursor over
   `Fixed` and `OraclePegged` trees. If empty, exit loop.
2. **Compute the effective price** of that order. For OraclePegged
   that's `oracle_price_lots + offset`.
3. **Check expiry / peg validity.** If the resting order is expired,
   emit an `OutEvent` (if the budget allows), remove it, and continue.
   If a pegged order is outside its peg_limit this tick, skip it
   (don't remove — it might be valid next tick).
4. **Check price compatibility.**
   - For Bid: `remaining > 0 && best_opposing_price ≤ order_price`.
   - For Ask: `remaining > 0 && best_opposing_price ≥ order_price`.
   - Market and IOC orders use their internal price ceiling/floor.
   If incompatible, exit the loop — done matching.
5. **Compute match size:**
   ```
   match_base = min(remaining_base_lots,
                    floor(remaining_quote_lots / best_opposing_price),
                    opposing.quantity)
   ```
   If `match_base == 0`, exit (can't even match 1 lot at the price).
6. **Self-trade check.** If `opposing.owner == taker.owner`:
   - `DecrementTake` → match for `match_base` but **emit a fill with
     zero fees** for both sides. (Self-trades carry no fee revenue.)
   - `CancelProvide` → emit `OutEvent` to remove your own resting
     order, then continue (don't take it).
   - `AbortTransaction` → return error; tx reverts.
7. **Emit `FillEvent`** with maker, taker, price, quantity, fees,
   and timestamps. Push to `EventQueue`.
8. **Decrement state.**
   ```
   remaining_base_lots  -= match_base
   remaining_quote_lots -= match_base × best_opposing_price
   opposing.quantity    -= match_base
   limit                -= 1
   ```
9. If `opposing.quantity == 0` → mark `maker_out = true` in the fill
   event; the leaf is removed and slot returned to maker on event
   consume.
10. If `limit == 0` or `remaining == 0` → exit loop.

### Step 4 — Post the remainder

If after the match loop there are still `remaining_base_lots > 0` and
the order is `Fixed`, `OraclePegged`, or `PostOnly`-class, the
matcher attempts to post (`book.rs:256-321`):

- **Market / IOC orders never post** — the remainder is just
  cancelled.
- **PostOnly orders only post if no match occurred at all** —
  otherwise the remainder is dropped, no fill, no rest.
- **PostOnlySlide orders** that *would* have crossed are re-priced
  to one tick *behind* the best opposing price and posted at that
  new price. (Or to the original price if no opposing order exists.)
- **Limit and OraclePegged limit orders** post the remainder.

Posting allocates a fresh leaf, computes the composite key with
`gen_order_id` (which bumps `PerpMarket.seq_num`), and inserts into
the appropriate tree. If the tree is full, the worst-priced existing
order is evicted (an `OutEvent` is emitted for it, freeing its
owner's slot when consumed).

### Step 5 — Update taker account

`book.rs:454-488` (`apply_fees`):

- `market.fees_accrued += taker_fees + maker_fees` (these are
  realized on the fee side immediately, even though the maker
  account doesn't see the credit until `consume_events`).
- `taker.taker_volume += quote_filled`.
- `taker.taker_base_lots`, `taker.taker_quote_lots` track
  fills already settled into the book but not yet consumed by the
  event queue (these are reserved for safety in health checks).

The taker's `bids_base_lots` / `asks_base_lots` are also bumped if
the order posted, so future health checks correctly count the
posted exposure.

## When the maker is updated

The matcher only updates the **taker** synchronously. The maker's
account is mutated lazily by `perp_consume_events`. Until then:

- The fill is *publicly visible* (the `FillEvent` is in the event
  queue and the `FillLogV3` was emitted).
- The maker's `quote_position_native` and `base_position_lots` have
  *not* yet moved.
- The maker's `bids_base_lots` / `asks_base_lots` have **already**
  been decremented in the matcher (so health stays consistent).
- `consume_events` settles maker fees into `quote_position_native`,
  emits `PerpMakerTradeLog`, and frees the perp open order slot.

`consume_events` processes up to 8 events per call
(`perp_consume_events.rs:51`). Anyone can call it; in production the
keeper service runs it in a tight loop.

## Evidence on chain

Every `new_order` call emits:

- One `PerpTakerTradeLog` per match group (cumulative quote/base/fees).
- One `FilledPerpOrderLog` per fill (price, quantity, taker_oo_slot,
  maker_oo_slot).
- For each pulled-out resting order: one `OutEvent` in the event
  queue and a corresponding entry in `PerpMakerTradeLog` once
  consumed.

These are the canonical receipts for off-chain accounting; the
fanout SSE stream re-broadcasts them in real time.

## Failure modes a trader will see

| Symptom | Cause |
|---|---|
| Order didn't post, nothing filled | PostOnly that would have crossed; or fully filled before reaching post step. |
| Quantity smaller than expected | `limit` reached, or `max_quote_lots` exceeded by the price. |
| Self-trade aborted | `AbortTransaction` SLT and a self-collision happened. |
| Order silently disappeared | TIF expired between place and the next matcher / consume. |
| Eviction | Tree was full and a higher-priority order evicted yours. |

Because every state transition emits an event, the
`/trace/sequence/{market}/{seq}` endpoint is the fast way to see
exactly what happened to a specific order.
