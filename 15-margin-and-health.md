# Margin and account health

Health measures whether an account can support its positions under the program's risk model. It is weighted asset value minus weighted liabilities, including contingent exposure from open orders. It is not the same as net asset value or withdrawable cash.

| Health type | Main use | Valuation |
| --- | --- | --- |
| Initial (`Init`) | New risk and post-action checks | Initial weights and conservative oracle/stable-price bounds |
| Maintenance (`Maint`) | Liquidation eligibility | Maintenance weights and oracle prices |
| Liquidation-end | Recovery from liquidation state | Initial-style weights with oracle valuation |

Under valid risk parameters, initial health is the most conservative of these measures. An account can be below initial requirements while still above maintenance.

## What the engine counts

Token balances use deposit or borrow indexes, prices and the relevant weights. Perp health includes signed base exposure, quote value, unsettled funding, pending taker fills and adverse open-order fill scenarios. Positive perp contribution can be reduced by the market's overall asset weight; negative contribution remains a liability. Spot open-order reservations add their own scenarios.

This is why “collateral divided by leverage” is not a complete risk calculation. Cross-market positions, oracle bands, concentration scaling and unconsumed events can all change the result.

## A small example

Assume $1,000 quote collateral, no orders or funding, and a long of 5 units bought at $100. With oracle and stable price both $100 and initial base asset weight 0.9:

```text
weighted base value = 5 × $100 × 0.9 = $450
perp quote value = −$500
perp contribution = −$50
initial health = $1,000 − $50 = $950
```

This example isolates the weight effect. Production health must use the complete cache and current configuration.

## Post-action checks are instruction-specific

The general account check accepts nonnegative post-initial health **or** an action that does not worsen negative initial health, with explicit rounding treatment. Some paths use stricter checks. Therefore “every action requires initial health ≥ 0” is too broad, and a client must not use that shortcut to reject valid risk-reducing activity.

Queued place operations use a health-region wrapper around dispatch. A final health failure returned by the transaction rolls back intermediate writes. Off-chain admission estimates do not override this check.

## Health is state-dependent

An order that passed local checks can fail later because prices, balances, fills, active positions or required accounts changed. A complete canonical health-account list is essential. A target-market-only list can omit cross-margin exposure and be rejected.

Use the core health implementation or a version-matched SDK for calculations. A UI health ratio must identify its denominator and health type; a percentage without those definitions is ambiguous.


## Implementation reference

Reviewed at `90267b20`. [cache.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/health/cache.rs) · [fermi_account.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/state/fermi_account.rs) · [execution_queue.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/instructions/execution_queue.rs). Source links require access to the implementation repository.
