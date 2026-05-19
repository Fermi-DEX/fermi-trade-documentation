# 16 · Risk Tiers and Liquidation

Any account whose `maint_health < 0` is liquidatable. There are no
"liquidation tiers" or per-position margin tiers — the same single
rule applies to every account in the group. What changes is the
**path** the liquidator takes through the account, depending on what
positions exist.

## Trigger

```
liquidatable iff maint_health < 0
```

`maint_health` uses oracle prices and maintenance weights. A
liquidator who sees this snapshot can call any of:

| Instruction | When it applies |
|---|---|
| `perp_liq_force_cancel_orders` | The account has resting perp orders. Frees them so the liquidator can act. |
| `serum3_liq_force_cancel_orders`, `openbook_v2_liq_force_cancel_orders` | Same, on serum/openbook orders. |
| `perp_liq_base_or_positive_pnl` | The account has perp base exposure or +PnL on a perp. |
| `perp_liq_negative_pnl_or_bankruptcy` | The account has only negative perp PnL left. |
| `token_liq_with_token` | The account has a borrow that needs to be reduced against another collateral. |
| `token_liq_bankruptcy` | The account has only borrows left and no collateral. |

Each one is permissionless. The liquidator's account picks up the
liability/exposure at a discount and books the discount as profit.

## End condition: `liq_end_health ≥ 0`

A liquidation step is bounded so the liqee doesn't get *more* than
absolutely needed. The phase exits when

```
liq_end_health ≥ 0
```

`liq_end_health` is a hybrid: init weights with oracle prices. It's
slightly stricter than maint (because of init's tighter base
weights), so the liqee has a tiny buffer above zero on exit and
isn't immediately re-liquidatable.

## Phase 1 — `perp_liq_base_or_positive_pnl`

This is the workhorse instruction
(`programs/fermi-v1/src/instructions/perp_liq_base_or_positive_pnl.rs`).
It executes up to four sub-steps in order, stopping as soon as
`liq_end_health ≥ 0`:

### 1. Reduce base if hupnl is negative

If your perp position has negative *health-unsettled* PnL, the
liquidator transfers base lots from you (long → short to liqor, or
short → long to liqor):

```
quote_transferred = -base_transferred × oracle_price × fee_factor

fee_factor (long  reduce) = 1 - base_liquidation_fee - platform_liquidation_fee
fee_factor (short reduce) = 1 + base_liquidation_fee + platform_liquidation_fee
```

(`perp_liq_base_or_positive_pnl.rs:295-322`.)

The liqee pays slightly more per lot than oracle (longs receive
slightly less, shorts pay slightly more); the liqor books the
discount as quote PnL on its perp position.

### 2-4. Settle positive PnL with discount

If your perp position has *positive* unsettled PnL but the rest of
your account is underwater, the liqor can claim the positive PnL at
a discount of `positive_pnl_liquidation_fee`:

```
liqee receives = (1 - positive_pnl_liquidation_fee) × settled_amount  // in USDC
liqor receives = settled_amount                                        // in USDC
discount       = positive_pnl_liquidation_fee × settled_amount         // = liqor profit
```

This is bounded by the same per-window settle limit that applies to
ordinary `perp_settle_pnl`.

### Stop condition

After each sub-step the program rechecks `liq_end_health`. If
`≥ 0`, the liquidation step exits. The liqee remains in the system
(with reduced exposure) and is no longer liquidatable.

## Phase 2 — `perp_liq_negative_pnl_or_bankruptcy`

Used when the liqee has flat base position but residual negative
quote on a perp (because their longs got fully liquidated and the
loss exceeded their spot collateral). The liquidator absorbs the
negative quote at a fee:

- Liqee's `quote_position_native` increases by `take_amount`
  (toward zero).
- Liqor's `quote_position_native` decreases by `take_amount`.
- Liqee's USDC bank decreases by `take_amount × (1 + fee)`.
- Liqor's USDC bank increases by `take_amount × (1 + fee)`.

If the liqee's USDC bank goes negative even after this transfer,
they are **bankrupt**, and the rest of the liability is covered by
the **insurance fund** (or socialized — see
[18 - Bankruptcy](18-bankruptcy-insurance.md)).

## Token-side liquidation

`token_liq_with_token` and `token_liq_bankruptcy` mirror the perp
flow on the spot side (`token_liq_with_token.rs`):

```
asset_transferred = liability × (liab_oracle_price / asset_oracle_price)
                            × (1 + liab_liquidation_fee)
                            × (1 + asset_liquidation_fee)
```

Both fees stack; `platform_liquidation_fee` on each Bank goes to the
group owner. The liquidator's profit is the difference between the
amount of asset they receive and what they paid out as the
liability.

## Force-cancel and force-close

- **`perp_liq_force_cancel_orders`** — Free pending maker orders so
  the liquidator can act on the position. No fee charged. Anyone
  can call once `maint_health < 0`.
- **`perp_force_close_position`** — Available only when
  `PerpMarket.force_close == 1` (a market in retirement). Lets the
  admin force the liqee's position to zero at oracle price. Does
  not require negative health.

## Sequence of operations a liquidator follows

1. Watch the `FermiAccount` stream / harness for accounts with
   `maint_health < 0`.
2. If any open orders, call `*_liq_force_cancel_orders` to free
   them.
3. Pick the worst-weighted position and call the matching
   liquidation instruction.
4. Loop until `liq_end_health ≥ 0` or the account is bankrupt.
5. If bankrupt, call `token_liq_bankruptcy` /
   `perp_liq_negative_pnl_or_bankruptcy` to draw from insurance and
   close the account.

The Continuum harness exposes a `/state/users/:owner` endpoint that
reports `maint_health` and `liq_end_health` directly so a liquidator
bot can sort candidates without having to recompute them locally.

## Costs to a trader

If you get liquidated:

- You lose the `base_liquidation_fee` discount on every base lot
  reduced (typically a few % per lot transferred).
- You lose the `positive_pnl_liquidation_fee` discount on any
  positive PnL settled by the liquidator (typically 2-5 %).
- You pay `platform_liquidation_fee` on top to the group owner.
- Your remaining open orders were force-cancelled (no extra fee but
  any stop-loss logic you had is gone).

How to avoid:

- Keep `init_health` well above zero — the cushion between init and
  maint is your safety margin.
- Use `reduce_only` orders for stops, so accidental flips don't
  push you negative.
- Subscribe to your own account stream and add a "warning"
  threshold (e.g. `init_health < 5 % × deposits`) so you can
  add collateral or close before maint goes red.
