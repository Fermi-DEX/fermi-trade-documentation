# 11 · Order Types

Every order on Fermi is an `Order` struct
(`programs/fermi-v1/src/state/orderbook/order.rs`):

```rust
pub struct Order {
    pub side: Side,                          // Bid | Ask
    pub max_base_lots: i64,                  // size cap
    pub max_quote_lots: i64,                 // optional spend cap
    pub client_order_id: u64,                // your tag
    pub reduce_only: bool,                   // close-only flag
    pub time_in_force: u16,                  // expiry seconds; 0 = forever
    pub self_trade_behavior: SelfTradeBehavior,
    pub params: OrderParams,                 // the type
}
```

`params` selects the order type. There are four variants.

## Order types

### 1. `Market`

```rust
OrderParams::Market
```

Crosses up to `max_base_lots` (and `max_quote_lots`) at whatever the
book offers, never posts the remainder, and pays the IOC `fee_penalty`
on the way in.

- Use for: immediate exit, panic close.
- Pitfall: **no slippage cap** beyond `max_quote_lots`. If you don't
  set `max_quote_lots`, you'll fill against arbitrary depth. Always
  set both caps for production order flow.

### 2. `ImmediateOrCancel { price_lots }`

```rust
OrderParams::ImmediateOrCancel { price_lots: 150_000 }
```

Crosses at any price as good as `price_lots` (≤ for bid, ≥ for ask),
never posts the remainder, and pays the IOC `fee_penalty`.

- Use for: aggressive limit hits, taker arbitrage.
- Identical to `Fixed { price_lots, ImmediateOrCancel }` from the
  matcher's perspective.

### 3. `Fixed { price_lots, order_type }`

```rust
OrderParams::Fixed {
    price_lots: 150_000,
    order_type: PostOrderType::Limit,         // or PostOnly | PostOnlySlide | ImmediateOrCancel
}
```

Limit order at an absolute price. The `order_type` selects post-side
behavior:

- **`Limit`** — Standard limit. Crosses what's crossable, posts the
  remainder.
- **`PostOnly`** — *Never crosses.* If any of the order would be
  marketable, the entire order is dropped (no fill, no rest). Use
  for guaranteed maker rebates.
- **`PostOnlySlide`** — If marketable, the order is **re-priced to
  one tick behind the best opposing price** and posted at the new
  price. Always posts (assuming there's room in the tree). The
  fallback is the original price if the opposing side is empty.
- **`ImmediateOrCancel`** — Same as the IOC variant; included here
  so post-only flags can be embedded in the same struct.

### 4. `OraclePegged { price_offset_lots, order_type, peg_limit, max_oracle_staleness_slots }`

```rust
OrderParams::OraclePegged {
    price_offset_lots: -10,                   // 10 lots below oracle
    order_type: PostOrderType::Limit,
    peg_limit: 145_000,                       // hard floor on bid (or ceiling on ask)
    max_oracle_staleness_slots: 100,
}
```

The on-book price is recomputed every iteration as `oracle_price_lots
+ price_offset_lots`. `peg_limit` is a hard ceiling for asks and
hard floor for bids — orders that would price beyond it are skipped
in iteration but not removed (they reappear as oracle moves back).

Pegged orders also carry `max_oracle_staleness_slots`: if the oracle
is older than this when the order is being matched, the order is
treated as invalid and skipped.

- Use for: passive market making that wants to track spot.
- Pitfall: an oracle stale-time spike will make your order
  un-matchable for a while. Set `max_oracle_staleness_slots`
  generously if you want to keep trading in volatile RPC conditions.

## Modifiers

### `time_in_force: u16`

Seconds since `placement_timestamp` until the order auto-expires.
`0` means good-till-cancel.

- Useful for "kill orders within 30s if not filled."
- Expiry is only enforced **lazily** — by the next matcher pass that
  encounters the order, or by `perp_consume_events`. Don't rely on
  exact-second expiry; expiry is **at most** TIF seconds.
- An expired order generates an `OutEvent` (and a corresponding fill
  log line marking it removed) the moment it's noticed.

### `reduce_only: bool` (per order)

If `true`, the matcher caps `max_base_lots` to *at most* the size
that brings your `base_position_lots` toward zero. Effectively a
"close only" flag.

- Useful for stop-loss bots that should never accidentally flip your
  position.
- Different from market-wide `reduce_only` (`PerpMarket.reduce_only`),
  which forces *every* order on the market to be reducing.

### `self_trade_behavior: SelfTradeBehavior`

Controls what happens when your new order would match against an
existing order owned by the *same Fermi account*. See
[13 - Self-Trade Prevention](13-self-trade-prevention.md). Three
modes:

- `DecrementTake` — match but **zero fees on both legs**.
- `CancelProvide` — cancel the resting (own) order, don't take it.
- `AbortTransaction` — reject the entire instruction.

### `client_order_id: u64`

Echoed in every fill event whose taker is your account. Use for
idempotent order management (replace flows, dedup), and to look up
your own orders in the book by ID
(`perp_cancel_order_by_client_order_id`).

### `max_quote_lots: i64`

Spend cap. The matcher exits a match step if it would consume more
quote than this remaining cap. Set together with `max_base_lots` to
get safe market orders.

## Quick decision matrix

| Goal | Type | Modifier |
|---|---|---|
| "Hit the offer right now, any depth I can get" | `Market` | set `max_quote_lots` |
| "Hit the offer up to $X price" | `Fixed { price, ImmediateOrCancel }` |  |
| "Place a passive bid at $X, give me a maker rebate" | `Fixed { price, Limit }` | maker fee may be negative |
| "Same, but if it's marketable, don't trade — just drop it" | `Fixed { price, PostOnly }` |  |
| "Same, but always post even if the price has crossed" | `Fixed { price, PostOnlySlide }` |  |
| "Track oracle ±5 ticks, refresh on every block" | `OraclePegged { offset: -5, Limit, peg_limit }` |  |
| "Bracket: cancel if not filled in 60s" | any | `time_in_force = 60` |
| "Closing only (never increase position)" | any | `reduce_only = true` |
| "I have an outstanding order; I want a new one but never against it" | any | `self_trade_behavior = CancelProvide` |

## Order-type validity matrix vs `params`

| `params` | `order_type` valid values |
|---|---|
| `Market` | n/a |
| `ImmediateOrCancel` | n/a |
| `Fixed` | `Limit`, `PostOnly`, `PostOnlySlide`, `ImmediateOrCancel` |
| `OraclePegged` | `Limit`, `PostOnly`, `PostOnlySlide`, `ImmediateOrCancel` |
