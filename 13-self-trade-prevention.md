# 12 · Self-Trade Prevention

A self-trade happens when a new order would match against an
existing order owned by the **same Fermi account**. Without
intervention this would either:

- Charge you both maker and taker fees on what is effectively a
  no-op (worst case), or
- Confuse PnL accounting on the position side.

Fermi's matcher detects same-`owner` collisions and applies the
behavior selected on the new (taker-side) order.

## The three modes

The behavior is set per-order in `Order.self_trade_behavior` from the
enum (`programs/fermi-v1/src/state/orderbook/order.rs:130-156`):

```rust
pub enum SelfTradeBehavior {
    DecrementTake = 0,    // default
    CancelProvide = 1,
    AbortTransaction = 2,
}
```

### `DecrementTake` (default)

What happens:

- The match proceeds — your new order trades against your resting
  order.
- A normal `FillEvent` is emitted, but with **`maker_fee = 0` and
  `taker_fee = 0`**.
- Your `base_position_lots` and `quote_position_native` are
  unchanged in net (a long that fills its own short doesn't move
  your net exposure).
- `bids_base_lots` / `asks_base_lots` reservations are released as
  normal.

When to use it:

- You want the trade to happen for accounting / open-order cleanup
  reasons but don't want to pay fees.
- This is the safe default and matches how most CEX self-trade
  handling works.

### `CancelProvide`

What happens:

- When the matcher hits your own resting order, it does **not**
  match. Instead it emits an `OutEvent` to remove the resting order
  from the book.
- The matcher then continues to the next opposing order, which may
  belong to another participant.
- Your new order can still fill against external liquidity.

When to use it:

- Replace flows: place a new bid at $X and have it implicitly cancel
  any of your bids at the same level you might have forgotten.
- Market makers who repost frequently and want guaranteed cleanup of
  stale quotes.

Subtlety: `CancelProvide` cancels **only the colliding** resting
order(s), not all your orders. If you have orders at multiple price
levels, only the ones the new order hits get cancelled.

### `AbortTransaction`

What happens:

- The instant the matcher detects a collision, it returns an error.
  The whole transaction reverts; nothing executes.

When to use it:

- You want a strict guarantee that no self-trade ever happens — even
  the harmless `DecrementTake` form. Useful for compliance / audit
  reasons or for testing.
- Order-management code that has already pre-cancelled and wants
  loud failure if a residual order is still on book.

## Mechanics in the matcher

From `book.rs:133-159`, on detecting `opposing.owner == taker_owner`:

```
match self_trade_behavior {
    DecrementTake    => {
        // proceed, but force fees to zero in the FillEvent
        match_quantity = base_match;
        emit FillEvent { maker_fee: 0, taker_fee: 0, ... };
    }
    CancelProvide    => {
        emit OutEvent { owner, owner_slot, quantity: opposing.quantity };
        // remove leaf, continue to next opposing order
    }
    AbortTransaction => {
        return Err(FermiError::WouldSelfTrade);
    }
}
```

Self-trade prevention is **per-collision**, not per-order. Inside
one `new_order` call you can collide multiple times (e.g. three of
your own orders at the same level); each one is processed
independently with the same selected behavior.

## Interaction with `client_order_id`

Self-trade prevention is on **owner**, not on `client_order_id`. Two
orders with the same `client_order_id` from the same account will
self-trade-prevent like any other; two orders from different
accounts will not, regardless of `client_order_id`.

If you need to deduplicate by client id (e.g. enforce "this is the
*only* order with this id"), do it client-side before submission —
the on-chain code does not enforce client-id uniqueness.

## What the relayer does

The relayer does not pre-empt self-trades. It simply submits the
intent. The matcher applies the selected behavior. This means:

- An `AbortTransaction` self-trade results in a *committed-and-failed*
  reveal — the on-chain tx reverts, the head advances, and a
  `QueueItemProcessed` event with the failure reason is emitted.
- A `DecrementTake` self-trade looks indistinguishable from a normal
  fill in the trace log, except both fees are zero.

For a UI or bot, if you want to *avoid* burning a slot on an
`AbortTransaction` failure, switch to `CancelProvide` for replace
flows; it never fails the tx.
