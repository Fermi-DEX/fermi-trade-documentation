# Bankruptcy, insurance and loss allocation

Insurance is a finite resource governed by eligibility and instruction rules. It is not a promise to make every trader or LP whole. When liquidation cannot cover a deficit, the core has separate token and perp loss-allocation paths.

## Token bankruptcy

A token borrow that cannot be repaid is a loss to the relevant bank. The instruction uses eligible group insurance where available, with token conversion and liquidation constraints. If the applicable insurance capacity is exhausted, residual loss can reduce that bank's deposit index.

Reducing the index lowers the native value of indexed deposits across the bank. Moving a deposit to another subaccount in the same bank does not remove this exposure. The implementation caps socializable loss to avoid driving the deposit index negative.

## Perp bankruptcy

The perp path can use eligible insurance and calls `PerpMarket::socialize_loss` for the residual. That function distributes loss through the market's long and short funding accumulators using open interest. It is **not** the token-bank deposit-index mechanism.

If open interest is zero, the function records `unsocialized_loss` rather than dividing by zero. In this code the passed loss is negative, so the stored accumulator reflects that sign convention. An indexer must not silently treat it as a positive claim asset.

## What to monitor

Track insurance eligibility and balance, liquidation events, token deposit-index changes, perp funding accumulator changes and unsocialized losses. A healthy service process does not prove that these resources are adequate.

Loss size depends on the actual deficit. There is no code guarantee that socialized loss is “tiny,” that insurance always covers it, or that keeping a pure-quote subaccount provides insulation from shared bank risk.

FLP LPs additionally bear the vault's trading, fee and recovery outcomes. The vault has no separate promise to reimburse strategy losses. [FLP recovery](34-flp-recovery.md) explains how residual PnL is treated at terminal closure.


## Implementation reference

Reviewed at `90267b20`. [token_liq_bankruptcy.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/instructions/token_liq_bankruptcy.rs) · [perp_liq_negative_pnl_or_bankruptcy.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/instructions/perp_liq_negative_pnl_or_bankruptcy.rs) · [perp_market.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/state/perp_market.rs). Source links require access to the implementation repository.
