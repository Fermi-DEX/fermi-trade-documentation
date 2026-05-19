# 05 · Collateral & Banks

Collateral on Fermi is held in **Banks** — one Bank per token mint.
Each Bank exposes a deposit rate, a borrow rate, weight parameters
that determine how much of the deposit counts toward your health, and
a vault that physically holds the tokens.

A token deposit on Fermi gives you:

- An **indexed deposit** on your Fermi account (a yield-bearing balance).
- Cross-margin against every market in the group.
- The right to borrow other tokens from the Bank (subject to health).

## Bank model

The most user-relevant fields on a Bank (full struct in
`programs/fermi-v1/src/state/bank.rs`):

| Field | Meaning |
|---|---|
| `mint` | SPL mint backing this Bank |
| `vault` | SPL token account holding the pooled tokens |
| `oracle` | Price feed account (Pyth, Switchboard, etc.) |
| `oracle_config` | `conf_filter`, `max_staleness_slots` |
| `deposit_index`, `borrow_index` | Compounding factors (`I80F48`) |
| `indexed_deposits`, `indexed_borrows` | Bank-wide totals |
| `init_asset_weight`, `maint_asset_weight` | Discount on positive balances for health |
| `init_liab_weight`, `maint_liab_weight` | Premium on borrows for health |
| `liquidation_fee` | Liqor's incentive on spot liquidation |
| `platform_liquidation_fee` | Group-owner cut |
| `loan_origination_fee_rate` | Charged once per new borrow |
| `loan_fee_rate` | Continuously accrues to lenders |
| `deposit_weight_scale_start_quote` | Above this aggregate USD deposit, asset weight scales down |
| `borrow_weight_scale_start_quote` | Above this aggregate USD borrow, liab weight scales up |
| `min_vault_to_deposits_ratio` | Withdrawals throttled if vault dips below this |

## Indexed balances

Your account stores `indexed_position`, *not* native amounts. The
relationship is:

```
positive balance (deposit):  native = indexed × deposit_index
negative balance (borrow) :  native = indexed × borrow_index
```

Both indexes start at 1.0 and grow over time as interest accrues.
Crucially, you don't need to "claim" interest — your balance grows
implicitly each time `token_update_index_and_rate` is called and the
index moves. From your point of view, `1000 USDC` deposited turns
into `1000 × (deposit_index_now / deposit_index_then)` USDC withdrawable.

## Interest model

Each bank uses a piecewise-linear utilization curve:

```
utilization = native_borrows / native_deposits

if utilization < util0:
  rate = rate0 × (utilization / util0)
elif utilization < util1:
  rate = rate0 + (rate1 - rate0) × (utilization - util0) / (util1 - util0)
else:
  rate = rate1 + (max_rate - rate1) × (utilization - util1) / (1 - util1)
```

Borrowers pay `rate + loan_fee_rate`; depositors earn `rate ×
utilization × (1 - loan_fee_rate)`. The bank parameters
`(rate0, util0, rate1, util1, max_rate)` are configurable per Bank.

`token_update_index_and_rate` is permissionless — the harness or any
keeper can call it. Indexes are also recomputed on every deposit /
withdraw / borrow that touches the Bank.

## Asset and liability weights

These are the foundation of [margin math](15-margin-and-health.md).
For a Bank holding price `p` with weights `w_init`, `w_maint`:

| Position | Init contribution | Maint contribution |
|---|---|---|
| Deposit (positive) | `+ balance × p × init_asset_weight` | `+ balance × p × maint_asset_weight` |
| Borrow (negative) | `- |balance| × p × init_liab_weight` | `- |balance| × p × maint_liab_weight` |

Typical ranges for high-quality collateral:

- `maint_asset_weight ≈ 1.00`, `init_asset_weight ≈ 0.85–0.95`
- `maint_liab_weight ≈ 1.00`, `init_liab_weight ≈ 1.05–1.20`

The init/maint *gap* is your margin buffer: a position is valid to
*open* only if init health is non-negative, but is liquidated only when
maint health goes negative. The wider the gap, the more cushion you
have against price moves.

## Weight scaling

To prevent oversized concentrations, each Bank scales weights with
the **aggregate** deposit/borrow against it (not per-account):

- If `total_deposit_value > deposit_weight_scale_start_quote`, the
  effective `init_asset_weight` is *reduced* proportionally —
  marginal collateral is worth less.
- Symmetrically, if total borrows exceed
  `borrow_weight_scale_start_quote`, `init_liab_weight` is *raised* —
  marginal borrows count more against your health.

These two knobs let governance enforce per-bank concentration caps
without rejecting deposits/borrows outright.

*Source: `state/bank.rs:1248-1266` (`scaled_init_asset_weight`,
`scaled_init_liab_weight`).*

## Maint weight shifts

`maint_weight_shift_start_ts`, `_end_ts`,
`_asset_target`, `_liab_target` let governance schedule a gradual
adjustment of maint weights between two timestamps. This is the
mechanism used to ratchet a bank from "active" to "wind-down" without
a sudden mass liquidation.

## Stable price band on init

`init` health uses a wider price band than `maint`/`liquidation_end`:

```
asset price (init) = min(oracle_price, stable_price)
liab  price (init) = max(oracle_price, stable_price)
```

The `stable_price` is a slow-moving filter on the oracle (see
[08 - Pricing](08-pricing-mark-price.md)). For deposits this is
*conservative*: oracle spikes can't temporarily inflate your
borrowing power; you have to let the stable price catch up.

## Withdrawal limits

A withdraw must satisfy:

1. Post-withdraw `init_health ≥ 0`.
2. `vault_balance / total_native_deposits ≥ min_vault_to_deposits_ratio`
   *after* the withdraw, unless the bank is in `reduce_only` mode.

The second clause guarantees there's always enough on-vault liquidity
for liquidators and other withdrawers. If the ratio would dip below,
your withdraw is partially served (or rejected), and you'll need to
wait for borrowers to repay or for `token_update_index_and_rate` to
discourage further borrowing.

## Insurance fund

The insurance fund is a *separate* token vault, attached to the
group, denominated in USDC. It is funded by a portion of liquidation
fees and by external top-ups from governance. See
[18 - Bankruptcy](18-bankruptcy-insurance.md) for how it's drawn.

## Reduce-only and oracle-staleness modes

A Bank can be marked `reduce_only` — no new borrows allowed, only
deposits and repays. This is the standard lever for winding down a
listing.

If the oracle for a Bank exceeds `max_staleness_slots`, every health
check that touches that Bank fails. This is intentional: stale price =
unsafe to value. To recover, refresh the oracle (Pyth pull, etc.)
before retrying.
