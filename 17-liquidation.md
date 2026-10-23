# Liquidation

Liquidation reduces an unhealthy account's risk through program-checked transactions. Maintenance health below zero can open liquidation; recovering from a recorded liquidation state uses liquidation-end health. A displayed estimate is not permission to liquidate unless the instruction's current-state checks pass.

## Why liquidation has phases

| Phase | Purpose |
| --- | --- |
| Cleanup | Cancel risk-bearing orders and settle available value |
| Position transfer / risk reduction | Repay token liabilities, transfer perp base or use eligible positive PnL |
| Bankruptcy | Resolve deficits that the remaining assets cannot cover |

Which instruction is available depends on the account's actual positions and phase predicates. The liquidation engine does not simply close every position at a single displayed “liquidation price.” Cross-margin accounts can have several assets, liabilities and pending events.

## Who does the work

Liquidators are off-chain actors that observe accounts and submit permissionless instructions. The program checks the target, transfer bounds, pricing, fees and liquidator health. The repository includes a liquidator service, but any valid caller can perform the supported actions.

Liquidation and maintenance operations are not universally sequenced through the trader AMQ. They can change account state between an optimistic preview and reveal. This is one reason deterministic order sequencing does not imply deterministic predictions from an old snapshot.

## Failure conditions

A stale oracle can block a liquidation. A thin book, insufficient liquidator capital, unavailable transaction inclusion or adverse gaps can prevent timely risk reduction. Liquidation incentives improve liveness only when someone can act profitably and safely.

An FLP trading account uses the same core risk engine and can be liquidated. Vault recovery is an additional strategy for meeting exits; it does not suspend core liquidation or create collateral.

See [bankruptcy and insurance](18-bankruptcy-insurance.md) for the treatment of residual losses.


## Implementation reference

Reviewed at `90267b20`. [cache.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/health/cache.rs) · [perp_liq_base_or_positive_pnl.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/instructions/perp_liq_base_or_positive_pnl.rs) · [token_liq_with_token.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/instructions/token_liq_with_token.rs) · [perp_liq_negative_pnl_or_bankruptcy.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/instructions/perp_liq_negative_pnl_or_bankruptcy.rs). Source links require access to the implementation repository.
