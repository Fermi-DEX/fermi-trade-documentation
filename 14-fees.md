# 13 · Fees

Every fee on Fermi is on-chain, programmatic, and credited to one of
two destinations: the **PerpMarket fee bucket** (eventually
withdrawable by the group owner) or directly to a counterparty
(maker rebates, settlement bonuses, liquidator profit). There are no
hidden off-chain fees.

This page enumerates every fee, where it's defined on chain, and a
worked example.

## Trading fees (per fill)

| Field | Meaning | Sign |
|---|---|---|
| `PerpMarket.maker_fee` | Fee paid by the resting side. | May be **negative** = rebate. |
| `PerpMarket.taker_fee` | Fee paid by the crossing side. | Must be ≥ 0. |
| `PerpMarket.fee_penalty` | Fixed quote-native fee on every IOC / Market order. | ≥ 0. |

Both `maker_fee` and `taker_fee` are stored as `I80F48` and are
applied as a **fraction of notional**:

```
fill_notional = match_base_lots × match_price × base_lot_size  (in quote native)

taker_fee_paid     = fill_notional × taker_fee
maker_fee_received = fill_notional × maker_fee   // negative if maker_fee < 0
```

The `fee_penalty` is a flat amount, charged on entry to `new_order`
when the order is `Market` or `ImmediateOrCancel`, regardless of
fills (`book.rs:66-70`):

```
taker.quote -= fee_penalty
```

This penalty exists to discourage spammy IOC traffic (each IOC costs
the matcher a full `new_order` pass).

## Self-trades

Both fees are **forced to zero** on a self-trade resolved with
`DecrementTake` (`book.rs:184-195`). `CancelProvide` self-trades
generate no fill at all (so no fee). `AbortTransaction` reverts.

## Fee accrual

When a fill happens (`book.rs:454-488`):

```
market.fees_accrued += taker_fees + maker_fees
                      // (i.e. net fee revenue for the protocol)
taker.taker_volume  += quote_filled
```

Note the **maker fee is netted against taker fee** in the fee
bucket: a 0.04 % taker, -0.02 % maker fill leaves `0.02 %` accrued
to the protocol per side.

The **maker's account** is credited the rebate (or charged the
fee) only when `perp_consume_events` runs; the matcher only updates
the taker's quote position synchronously.

## Settlement bonuses

`perp_settle_pnl` is permissionless. To incentivize anyone to settle,
the market pays a bonus to the caller when the conditions are right:

| Field | Effect |
|---|---|
| `settle_fee_flat` | Quote-native bonus to the caller. |
| `settle_fee_amount_threshold` | Settlement amount needed to earn the flat fee. |
| `settle_fee_fraction_low_health` | Extra fraction of settled PnL when the +PnL account is unhealthy. Capped at 2× the flat fee. |

Practical effect: if you call `settle_pnl` on a healthy +PnL counter
with a settled amount above threshold, you collect `settle_fee_flat`
in USDC. If the +PnL side is approaching liquidation, the bonus
scales up.

## Liquidation fees

| Field | Where it goes | Trigger |
|---|---|---|
| `PerpMarket.base_liquidation_fee` | Liquidator | Per-base-lot transferred during `perp_liq_base_or_positive_pnl`. |
| `PerpMarket.positive_pnl_liquidation_fee` | Discount on settled positive PnL during liquidation. | Liqee receives `(1 - fee) × settled`. |
| `PerpMarket.platform_liquidation_fee` | Group owner | Additional cut, **on top of** `base_liquidation_fee`. |
| `Bank.liquidation_fee` | Liquidator | On spot-token liquidation `token_liq_with_token`. |
| `Bank.platform_liquidation_fee` | Group owner | Additional cut on spot liquidation. |

The fee math for perp base reduction (`perp_liq_base_or_positive_pnl.rs:295-322`):

```
For long reduction:  fee_factor = 1 - base_liq_fee - platform_liq_fee
For short reduction: fee_factor = 1 + base_liq_fee + platform_liq_fee

quote_transferred = -base_transferred × oracle_price × fee_factor
                                         (in oracle quote units)
```

So if `oracle_price = 100`, `base_liq_fee = 0.02`, `platform =
0.005`, and a liquidator buys 1 long lot from a liqee:

```
fee_factor       = 1 - 0.02 - 0.005 = 0.975
liqor pays liqee = 1 × 100 × 0.975 = 97.5
liqor profit     = 100 - 97.5 = 2.5      // captured as quote on liqor's perp
group revenue    = 0.5                    // platform_liquidation_fee × 100 × 1
```

Spot-token liquidation works analogously
(`token_liq_with_token.rs`):

```
asset_transferred = liab × (liab_price / asset_price) × (1 + liab_fee) × (1 + asset_fee)
```

The liquidator captures the difference between `asset_transferred ×
asset_price` and `liab × liab_price`.

## Fee withdrawal

Accrued fees sit on the `PerpMarket` until two admin paths drain them:

- **`perp_settle_fees`** moves accrued fees into `fees_settled` and
  pays them out into the settle-token vault. Permissionless to
  trigger; the actual withdrawal is gated on the +PnL leg being
  collateralized (no bankrupt-fee withdrawal).
- **`admin_perp_withdraw_fees`** (admin only) transfers settled fees
  from the perp settle vault to a destination token account.

Token fees follow the same pattern but on the Bank
(`admin_token_withdraw_fees`).

## Worked example — placing one IOC on SOL-PERP

Assume:

- `taker_fee = 0.0004` (4 bps), `maker_fee = -0.0002` (-2 bps rebate),
  `fee_penalty = 0.001` (USDC native ≈ 0.001 USDC)
- Order: bid 1 SOL at `$150`, IOC.
- Fills 1 SOL at `$150` against a resting maker.

```
match_notional = 1 SOL × $150 = $150 = 150_000_000 native

taker_fee_paid     = 150_000_000 × 0.0004 = 60_000 native ($0.06)
maker_fee_received = 150_000_000 × 0.0002 =  30_000 native ($0.03)

market.fees_accrued += 60_000 - 30_000 = 30_000  ($0.03 net)

taker.quote -= 60_000 + 1_000 (fee_penalty)        = -61_000 ($0.061)
maker.quote += 30_000   (credited when consume_events runs)
```

The taker has spent `$0.061` total fees + penalty for `$150` of
notional volume. The maker netted `$0.03` rebate. The protocol
captured `$0.03`.

## A few non-obvious things

- **Fee penalty is on placement, not fills.** A no-fill IOC still
  costs you `fee_penalty`. This is intentional — it prices in the
  matcher work.
- **Maker rebates aren't free money.** They settle against
  `quote_position_native` only on `consume_events`; until consumed
  they're "in flight." Don't model them in your real-time PnL until
  you see the maker trade log.
- **Fees accrue to the protocol but withdrawals respect health.**
  `perp_settle_fees` won't withdraw fees if doing so would push the
  group's books into unsocialized loss; this is the same invariant
  that protects depositors.
- **Liquidation fees on perps are paid in quote, not in base.** The
  liqor takes over base at a discount and books the difference as
  quote PnL. This is why liquidators show up in the fill log as
  large maker-side trades, not as "liquidate" events on the book.
