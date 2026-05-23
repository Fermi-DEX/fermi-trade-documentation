# On-chain Execution, Margin, and Risk

Fermi-v1's speed layer is useful only because execution is authoritative
on chain. The on-chain program is where order placement, cancels,
matching, book updates, positions, collateral, margin, funding, fees,
liquidation, and bankruptcy are enforced.

This page explains the execution and risk system at a conceptual level
rather than describing formulas or account layouts.

## Cross-margin accounts

Fermi-v1 uses account-level health. A user's collateral and positions are
evaluated together rather than as isolated balances for every single
market.

This matters because a perp trader often has multiple positions and
collateral types. A cross-margin model can use the overall account
condition to decide whether new exposure is allowed, whether a withdrawal
is safe, or whether liquidation is needed.

## Account health

Health is the system's summary of whether an account can support its
positions. Positive health means the account has room. Negative
maintenance health means the account can be liquidated.

Different health flavors are used for different decisions:

- Opening new exposure should be conservative.
- Liquidation should reflect current maintenance safety.
- Recovery should move an account back into a safer region.

The important conceptual point is that risk checks are not only an
off-chain courtesy. The relayer may pre-check an order for speed, and
Continuum may simulate its effect, but the program still enforces health
when the order executes on chain.

## Funding and mark behavior

Perpetual futures need funding because they do not expire. Funding is the
mechanism that pushes perp prices and spot/oracle reference prices toward
each other over time.

Fermi-v1 computes and applies funding through the program. Traders and
integrators can observe funding state and reconcile changes through
public market data and account state.

## Liquidation

Liquidation is the mechanism that protects the market when an account no
longer has enough margin.

Fermi-v1 makes liquidation permissionless. The operator is not the only
party that can act. If an account becomes liquidatable, eligible actors
can help reduce risk and move the account toward a safer state.

The benefit is liveness. Risk reduction does not depend entirely on a
single internal liquidation desk.

## Bankruptcy and insurance

In extreme moves, an account may not have enough equity to cover losses.
The bankruptcy and insurance path defines how those losses are handled.

This is part of the on-chain risk design because a derivatives venue
needs a deterministic answer for tail events. The important user-facing
point is that the loss-handling path is part of the program rules rather
than an opaque operator decision after the fact.

## Why execution and risk belong on chain

If custody is on chain but matching is off chain, users still depend on
an operator database for the most important market action: which orders
traded, posted, or canceled. If matching is on chain but risk is off
chain, users still depend on an operator database for whether accounts
are solvent and what balances mean.

Fermi-v1 keeps matching, book mutation, risk, funding, and liquidation in
the same public state machine.

That design gives integrators a clean reconciliation target. A bot may
use the relayer and Continuum for speed, but its accounting and order
state can still reconcile back to chain state.

## What users should understand

On-chain risk enforcement does not remove trading risk.

Users can still be liquidated. Oracles can move. Liquidity can vanish.
Funding can be costly. Large orders can suffer slippage. Congestion can
delay transactions.

The benefit is not that leverage becomes safe. The benefit is that the
rules for order execution, leverage, accounting, and liquidation are
inspectable and enforced by program state.
