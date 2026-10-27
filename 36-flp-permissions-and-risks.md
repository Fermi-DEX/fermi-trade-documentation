# FLP permissions and risks

FLP separates program authority, administration, and trading delegation.
These roles have different powers. A deposit approval is not a trading delegation.

## Roles

| Role | Responsibility |
|---|---|
| Vault program authority | Owns the trading account and controls program-owned token accounts through PDA signatures |
| Administrator | Manages supported parameters, deposit approvals, delegate changes, graduation, and administrative recovery actions |
| Guardian | Performs the emergency actions allowed by the program |
| Trading delegate | Signs permitted trading actions for the vault account |
| Keepers and public callers | Submit maintenance and recovery actions when the instruction permits them |
| FLP upgrade authority | Can authorize a replacement FLP program |
| Core upgrade authority | Can authorize a replacement Fermi core program |

The delegate is not the owner of the vault account and cannot use ordinary ownership powers to withdraw LP assets.
Trading authority still carries economic risk: permitted trades can lose money.
An LP does not approve each individual trade.

Both deployed programs are upgradeable. Source verification does not make them immutable or remove upgrade-authority risk.
The current vault parameter timelock is zero. Do not assume that configuration changes have an advance waiting period.

## Pauses and the breaker

Deposit pauses, the public-deposit pause, and withdrawal pauses have separate effects.
A public-deposit pause does not necessarily block an approved immediate deposit.
An existing funded claim is different from a new withdrawal request.
The user API reports the current availability and ticket state for each path.

The drawdown-breaker setting is currently zero, so that numerical drawdown trigger is disabled.
The deployed release does not support a numerical Init-ratio breaker.
This does not disable core margin checks, liquidation handling, or administrative emergency powers.

A liquidating core account can trip the breaker without a normal NAV calculation.
Pending vault events do not automatically block `check_breaker`. Reset has stricter requirements, including the pending-event check.
The breaker transaction does not first sweep idle funds into the core account.

## Material risks

- **Trading losses:** adverse prices, inventory exposure, fees, and funding can reduce share value.
- **Settlement risk:** marked profit can remain uncollectible or unavailable for withdrawal.
- **Entry/exit asymmetry:** positive unsettled PnL is counted at entry and excluded from current withdrawal NAV.
- **Liquidity risk:** FIFO batches, bank liquidity, and insufficient market depth can delay payment.
- **Liquidation risk:** the core can liquidate unhealthy positions, with associated costs and losses.
- **Oracle risk:** invalid, stale, or divergent prices can block actions or affect valuation.
- **Program risk:** defects in the vault, core, or token programs can affect assets and claims.
- **Operational risk:** keeper, RPC, or reader failures can delay actions or display stale information.
- **Authority risk:** administrator actions and program upgrades can change the operating conditions.
- **Asset risk:** USDC and the Solana network introduce risks outside the vault's trading strategy.

## What verification proves

A successful source verification proves that a build from the identified public commit matches the deployed program hash.
It does not prove that the strategy is profitable, that every dependency is safe, or that the program has no defects.
It is not an audit or insurance.

The [deployment page](37-flp-deployment.md) separates the verified FLP program from the core verification status.
The [reader guide](38-flp-integration.md) explains how to interpret incomplete and stale data.

Source: [Deployed FLP program](https://github.com/Fermi-DEX/fermi-v1-programs/tree/623f113075bd124948eabac8589bfbe8c53b11e8/flp/programs/flp-vault/src).
