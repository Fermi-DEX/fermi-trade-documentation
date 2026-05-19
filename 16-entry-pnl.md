# 15 · Entry Price and PnL

PnL on a Fermi perp position has three forms, each useful for a
different purpose.

| Form | Definition | Where it lives |
|---|---|---|
| **Unsettled PnL** | Mark-to-market against the oracle. | Computed; not stored. |
| **Health unsettled PnL (hupnl)** | Risk-weighted unsettled PnL. | Computed; flows into health. |
| **Realized PnL** | What `perp_settle_pnl` has already moved into your USDC balance. | Stored in `perp_position`. |

Plus two scalar accumulators:

- **`realized_trade_pnl_native`** — lifetime trade P&L (sum of fills
  at fill price minus your average entry).
- **`realized_other_pnl_native`** — funding paid/received,
  liquidation fees, etc.

## Position state per perp

From `programs/fermi-v1/src/state/fermi_account_components.rs`:

| Field | Meaning |
|---|---|
| `base_position_lots` | Net exposure. + = long, - = short. |
| `quote_position_native` | Quote-side balance (oracle units). Drives unsettled PnL. |
| `quote_running_native` | Used for average-entry tracking. |
| `bids_base_lots` / `asks_base_lots` | Reserved for resting orders (used in worst-case health). |
| `taker_base_lots` / `taker_quote_lots` | Reserved for fills sitting on the event queue. |
| `taker_volume`, `maker_volume` | Lifetime cumulative quote volume. |
| `perp_spot_transfers` | Net of all `perp_settle_pnl` movements. |
| `long_settled_funding`, `short_settled_funding` | Funding marks at last touch. |
| `realized_trade_pnl_native`, `realized_other_pnl_native` | Cumulative buckets. |
| `settle_pnl_limit_window`, `settle_pnl_limit_settled_in_current_window_native` | Per-window settle rate-limit state. |

## Average entry price

When a fill increments your position in the *same direction* as
your existing exposure (e.g. long add to long), `quote_running_native`
is updated so that the resulting `quote_running_native /
base_position_lots` is your **size-weighted average entry**.

When a fill *reduces* your exposure (closes part of a long), the
matcher computes the realized P&L on the closed lots:

```
realized_per_lot = fill_price - avg_entry_price       (for closing a long)
realized_per_lot = avg_entry_price - fill_price       (for closing a short)

realized_trade_pnl_native += realized_per_lot × closed_base_native
```

`avg_entry_price` itself does *not* change on reductions (you've
just closed at the average; the leftover position keeps the same
average).

When a fill *flips* your exposure (e.g. short of -3, you sell 5 →
end at +2 long), it's split into a "close 3 at fill price" leg and
an "open 2 at fill price" leg, with the realized PnL booked on the
close and the new average entry set on the open.

## Unsettled PnL (the mark-to-market)

```
unsettled_pnl_native = quote_position_native + base_position_native × oracle_price
```

This is what your trading UI shows as "uPnL" or "unrealized PnL." It
moves continuously with the oracle.

It includes:

- All your open trades, marked to oracle.
- Funding accrued since last touch (because funding is folded into
  `quote_position_native` lazily — but `update_funding` runs each
  block).
- Trading fees paid (also in `quote_position_native`).

It does **not** include open-order reservations (those are health-
relevant, not PnL-relevant).

## Health-unsettled PnL (hupnl)

For health, raw unsettled PnL is too generous — a positive perp
PnL on a hot market shouldn't immediately let you over-borrow. So
the health cache uses a weighted form:

```
base_contribution  = base_position_native × base_price × base_weight
quote_contribution = quote_position_native
hupnl              = base_contribution + quote_contribution
hupnl              = min(hupnl, init_overall_asset_weight × something_positive_capped)
```

Roughly:

- A short position with positive PnL gets its *positive* part
  scaled by `init_overall_asset_weight`. If that weight is `0`, the
  positive PnL counts as `0` for borrowing purposes — settle first
  if you want to use it.
- Negative PnL is **always** counted in full (no protective
  weighting in your favor).

## Realized PnL: settlement

`perp_settle_pnl(account_a, account_b, perp)` moves PnL between
two accounts in the *same* perp market — one with positive
unsettled PnL (`A`), one with negative (`B`).

The amount settled is bounded by:

- `min(A.unsettled_pnl, |B.unsettled_pnl|)`.
- A's per-window `settle_pnl_limit` (`settle_pnl_limit_factor ×
  base_native × stable_price` per window).
- B's "settle health" — B must have positive spot collateral
  remaining after taking the loss; otherwise it's bankrupt and
  needs `perp_liq_negative_pnl_or_bankruptcy` instead.

The settled amount is moved as USDC (the market's `settle_token`):

- A's `quote_position_native` decreases by `settle_amount`.
- A's USDC bank balance increases by `settle_amount × (1 -
  settle_fee_fraction)`.
- B's `quote_position_native` increases by `settle_amount`.
- B's USDC bank balance decreases by `settle_amount`.
- A small bonus is paid to the *caller* (see [14 - Fees](14-fees.md)).

Both accounts' `perp_spot_transfers` is updated accordingly so the
realized P&L is auditable.

## Settlement rate limits

Why limit settlement?

- A market that's been profitable for one side might be temporarily
  printing money against an oracle gap.
- Without a cap, the +PnL side could withdraw the entire profit
  immediately and leave the -PnL side bankrupt before any
  liquidation could trigger.

The cap, per perp:

```
settle_pnl_limit_window_size_ts          // e.g. 86_400 (24 h)
settle_pnl_limit_factor                  // e.g. 0.2  (20 %)

per-window cap (unrealized):
  factor × abs(base_position_native) × stable_price

per-window cap (when realizing):
  factor × abs(reduced_native) × stable_price
```

Setting `settle_pnl_limit_factor` to a negative value disables the
cap. The default is `0.2` (`perp_market.rs:535`), the window is
`24 h` (`perp_market.rs:537`).

## Funding effects on PnL

Each time your perp position is touched (place, cancel, fill, settle,
liquidate), the program subtracts `(market.long_funding -
position.long_settled_funding) × base_position_lots` from
`quote_position_native` if you're long, or the symmetric short
calculation if you're short. Funding therefore directly *reduces or
increases* your unsettled PnL each block.

Realized funding is accumulated into `realized_other_pnl_native`,
not `realized_trade_pnl_native` — useful for tax reporting where
funding may be classified separately from trade gains.

## Reading PnL programmatically

```ts
const ps = fermiAccount.getPerpPositionByMarketIndex(0);
console.log({
  basePosition:    ps.basePositionLots.toString(),
  quotePosition:   ps.quotePositionNative.toString(),
  unsettledPnl:    ps.getUnsettledPnl(perpMarket, oraclePrice).toString(),
  realizedTrade:   ps.realizedTradePnlNative.toString(),
  realizedOther:   ps.realizedOtherPnlNative.toString(),
  netSpotXfer:     ps.perpSpotTransfers.toString(),
});
```

The harness exposes the same numbers under
`GET /trader/{authority}/pnl`, with funding and trade buckets
broken out.

## Closing a position cleanly

To end with a clean account row, do all three:

1. **Close the base.** Place an opposite-side order until
   `base_position_lots == 0`.
2. **Settle the quote.** Call `perp_settle_pnl` against any
   counterpart with the opposite-sign unsettled PnL.
3. **Deactivate.** Once base = 0, unsettled PnL = 0, and reserves =
   0, call `perp_deactivate_position` to free the slot.
