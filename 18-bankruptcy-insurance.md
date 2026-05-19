# 17 · Bankruptcy and the Insurance Fund

A bankruptcy on Fermi is an account whose remaining liabilities
exceed its assets after liquidation: a perp leg with negative
unsettled PnL larger than its USDC bank balance, or a token borrow
larger than any remaining collateral. The system has three layers of
defense:

1. **Liquidation profit** to the liquidator — already covered in
   [17 - Liquidation](17-liquidation.md).
2. **Insurance fund** payout — a USDC vault held by the group.
3. **Socialized loss** — last resort, distributed proportionally
   across remaining depositors of the affected token.

## Insurance fund

The insurance fund is an SPL token account owned by the group PDA.
It holds USDC (the settle token). It's funded by:

- A scheduled portion of liquidation fees (configurable via
  `Group.insurance_fund_fees_share`).
- External top-ups via `group_change_insurance_fund` /
  `group_change_insurance_fund` (governance).

Eligibility for a perp market to draw from the fund:

```
PerpMarket.group_insurance_fund == 1
```

(See `state/perp_market.rs:265-271`.)

If a perp market is *not* eligible, its bankruptcies skip step 2 and
go straight to socialized loss.

## How a perp bankruptcy resolves

The instruction is `perp_liq_negative_pnl_or_bankruptcy`. After all
phase-2 transfers (liqor takes negative quote at a fee), if the liqee
still has negative `quote_position_native` AND empty USDC balance:

1. Compute `bankruptcy_amount` = absolute value of remaining negative
   quote.
2. If the perp is insurance-fund eligible, `transfer_from_insurance =
   min(bankruptcy_amount, insurance_balance)` is moved from the
   group's insurance vault into the perp's settle vault, and the
   liqor receives that amount as USDC.
3. The remainder (`bankruptcy_amount - transfer_from_insurance`) is
   **socialized**: every depositor of the settle token (USDC)
   absorbs a proportional share via a one-time `deposit_index`
   reduction.

The on-chain bookkeeping path is in
`programs/fermi-v1/src/instructions/perp_liq_negative_pnl_or_bankruptcy.rs:166-199`.

### Socialization mechanics

When socialization happens:

```
loss_per_unit = bankruptcy_remainder / total_indexed_deposits
deposit_index_after = deposit_index_before × (1 - loss_per_unit / oracle_price)
```

(Approximation; the exact code uses I80F48 arithmetic and a separate
field `bank.dust` to handle rounding.)

Concretely: if the USDC bank has `100 000 000` indexed deposits and a
bankruptcy of `1 000` USDC must be absorbed, every depositor's
indexed balance is *unchanged* but the index falls by `0.001 %`.
Net result: every USDC depositor effectively loses 0.001 % of their
position.

This is unfortunate but bounded — and almost always small in
absolute terms because the liquidator profit + insurance fund
should cover the bulk of any drawdown.

## Unsocialized loss

Socialization requires a non-zero `total_indexed_deposits` to spread
the loss across. If the bank is *empty* (no depositors, e.g. a
brand-new bank or one being wound down), there's nobody to socialize
the loss to. In that case the loss is recorded as
**unsocialized loss** on the perp:

```
PerpMarket.unsocialized_loss += loss_amount
```

This is an accounting shortfall in the settle-token vault. It does
not break invariants — but it does mean that, until governance
recapitalizes, there's `unsocialized_loss` worth of USDC owed to
the system that can never be paid.

This is mostly a theoretical safeguard; in practice the live banks
all have deep enough deposits that socialization absorbs everything.

## How a token bankruptcy resolves

`token_liq_bankruptcy` is the spot-side equivalent. After all
liquidator transfers, if the liqee still has a borrow with no
remaining collateral:

1. The borrow is treated as a loss to the lending Bank.
2. If the Bank's mint == settle token, the loss is socialized
   directly (bank index ratchet).
3. Otherwise, the bank acquires a synthetic claim against the
   insurance fund (denominated in settle token), drawn first if
   available, with the residual socialized to that bank's depositors.

## Insurance fund replenishment

The insurance vault grows from:

- A configurable share of every liquidation fee (perp + token).
- Direct top-ups via the admin instruction.
- Any fee-buyback mechanism governance chooses to wire up.

It does not earn yield on its own; it's a passive USDC vault.

## How traders observe bankruptcy events

The relayer + harness emit:

- `PerpLiquidateBankruptcyLog` — per-bankruptcy event with
  liquidator, liqee, transferred amounts, insurance amount.
- A `Bank` index update on socialization.
- A `PerpMarket.unsocialized_loss` change if socialization couldn't
  cover.

Subscribe to the fanout SSE stream or query the harness's events
endpoint.

## What this means for a trader

Worst case for a depositor of the settle token (USDC) is a
**socialized loss**: a tiny percentage haircut on your USDC
balance, distributed across every depositor in proportion.

In practice this has happened only during extreme oracle outages or
exchange-wide volatility events. The combined buffer (liquidator
profit, then insurance, then socialization) is designed so the
typical trader never notices.

Worst case for a depositor of a *non-settle* token (e.g. SOL bank
with an underwater SOL borrower): your SOL deposit is haircut by
the same socialization mechanism. The same protections apply.

If you want explicit insulation from socialization, keep collateral
in a sub-account separated from any perp risk. A pure-USDC sub-
account with no borrows is only exposed via the system-wide USDC
bank socialization, which is always orders of magnitude smaller
than any single account's PnL swing.
