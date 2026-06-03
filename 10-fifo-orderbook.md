# 09 · FIFO Order Book

Fermi runs a strict price-time-priority on-chain order book. Every
perp market has a separate `BookSide` account for bids and asks;
each side internally holds **two** ordered trees:

1. **`Fixed`** — orders placed at an absolute `price_lots`.
2. **`OraclePegged`** — orders placed at `oracle_price_lots +
   price_offset_lots`. The effective price is recomputed on every
   match and during iteration.

Both trees are merge-iterated whenever the matcher needs the next
order: at every step it picks the better-priced of the two trees'
fronts and matches against that.

## Tree shape and capacity

Each tree is a **slab-allocated binary search tree** over a 1024-node
buffer. Each side (bids OR asks) holds its own pair of trees:

```
constants used:
  MAX_ORDERTREE_NODES = 1024
  EVENT_QUEUE_LEN     = 488
```

*Sources: `state/orderbook/ordertree.rs:10`,
`state/orderbook/queue.rs:11`.*

So each `BookSide` account can hold up to `1024` Fixed + `1024`
OraclePegged orders, per side, per market. Eviction (see below)
keeps the data structure size-bounded.

## The composite key — how price-time priority is encoded

Every leaf in either tree has a `u128` key formed as:

```
price_data : u64    // upper 64 bits — price for sorting
seq        : u64    // lower 64 bits — for FIFO at a single price level
```

The trick is in how `seq` is encoded for bids vs asks (from
`state/orderbook/nodes.rs:32-37`):

```rust
pub fn new_node_key(side: Side, price_data: u64, seq_num: u64) -> u128 {
    let seq_num = if side == Side::Bid { !seq_num } else { seq_num };
    let upper = (price_data as u128) << 64;
    upper | (seq_num as u128)
}
```

So:

- For **asks**: lower price first, then earliest `seq` first → cheapest
  resting offer wins, FIFO within a tick.
- For **bids**: highest price first (achieved by encoding price in a
  way that sorts descending on iteration), then earliest `seq` first
  (achieved by *bitwise inverting* the seq before laying it in the
  lower 64 bits).

The result: `iter_valid()` on either side always yields the
**best-price, oldest-first** order next.

## Why two trees per side?

The `Fixed` and `OraclePegged` trees have different sort keys (oracle-
pegged price changes every block), so they cannot coexist in one
tree. The matcher iterates them with a **merge cursor** — at each
step it computes the OraclePegged tree's effective best price (using
the current `oracle_price_lots`), and compares to the Fixed tree's
front. Whichever side is better gets matched next.

This means:

- Oracle-pegged orders behave like dynamic limit orders that keep
  refreshing relative to oracle.
- A pegged order at `oracle + 0` is essentially "best market quote"
  and will trade *with* the same priority as a fixed order at the
  same effective price.
- A pegged order with a `peg_limit` sets a hard ceiling/floor — if
  `oracle_price + offset` exceeds that bound, the order is *skipped*
  in iteration (not removed) and reappears next tick.

## What lives in a leaf

```rust
pub struct LeafNode {
    pub owner_slot: u8,        // index in owner's PerpOpenOrders array
    pub key: u128,             // composite (price, seq)
    pub owner: Pubkey,         // the Fermi account
    pub quantity: i64,         // remaining base lots
    pub timestamp: u64,        // block time of placement
    pub time_in_force: u16,    // expiry window in seconds; 0 = never
    pub peg_limit: i64,        // -1 = no limit (Fixed); cap for OraclePegged
    pub client_order_id: u64,  // user-supplied id (echo on fills)
}
```

*Source: `state/orderbook/nodes.rs:136-176`.*

The `owner_slot` lets the matcher write back to the correct
`PerpOpenOrder` slot in the owner's account in O(1).

## Order id and identity

The **on-chain order id** is the full 128-bit composite key. You
need it to cancel by id (`perp_cancel_order`).

```ts
const orderId = oo.id;        // u128
await client.perpCancelOrder(group, fermiAccount, perp, orderId);
```

You can also cancel by `client_order_id` (`perp_cancel_order_by_client_order_id`),
or by side (`perp_cancel_all_orders_by_side`), or all
(`perp_cancel_all_orders`).

## Validity, expiry, peg limits, and self-trade markers

While iterating, the bookside iterator (`bookside_iterator.rs:25-194`)
returns each order along with a *validity* flag:

- **Expired** (TIF passed): `now_ts > timestamp + time_in_force`.
- **PegLimit exceeded**: `oracle_price + offset > peg_limit` (asks)
  or `< peg_limit` (bids). Order is skipped this iteration.
- **Self-trade collision** (in matching only): handled per the order's
  `self_trade_behavior`. See [13 - Self-Trade Prevention](13-self-trade-prevention.md).

Expired orders are **opportunistically removed** by the matcher (up
to 5 per `new_order` call, per `state/orderbook/book.rs`) and a
synthetic `OutEvent` is pushed to the event queue. Expired orders
that never collide with a new order are eventually cleaned by
`perp_consume_events`.

## Eviction

When a tree is full and a new order tries to post, the worst-priced
existing order on the same side is evicted (`OutEvent` emitted, slot
returned to the owner). This guarantees the trees never refuse a new
order *purely* because they're full — but it also means leaving a
huge stack of low-priority orders on a busy market is risky: someone
will push you out.

Practically, on the live SOL/ETH/BTC markets the trees rarely get
near full; the constraint is much more often the per-account
`PerpOpenOrders` size (default 6 slots) than the bookside.

## Determinism and replay

Because price-time priority is fully encoded in the keys, and keys
are assigned at *commit* time using the per-market monotonic
`seq_num`, two off-chain simulators that consume the same event
stream will arrive at the same book layout. This is the basis of the
optimistic view maintained by the optimistic harness — it can preplay an intent
against its mirror and produce the exact fills the on-chain matcher
will produce, modulo oracle drift in the OraclePegged tree.
