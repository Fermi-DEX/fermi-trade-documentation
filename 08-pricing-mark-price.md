# Oracle, stable price and book price

Fermi uses different prices for different questions. A UI label such as “mark price” must say which one it displays.

| Question | Relevant price |
| --- | --- |
| At what price does an order fill? | Eligible resting order's price on the book |
| What is the reference value of a position? | Oracle price with the relevant accounting rules |
| Can an account increase risk? | Initial-health valuation using oracle/stable-price bounds |
| Is liquidation permitted? | Maintenance-health valuation and account state |
| What funding rate applies? | Book impact prices relative to oracle, clamped to market bounds |
| What is an FLP share worth for entry or exit? | NAV_high or NAV_low, respectively |

## Why a stable price exists

Initial health should not grant full borrowing power merely because a recent oracle move makes collateral look more valuable. The stable-price model supplies another reference. Initial assets generally use the lower oracle/stable price; liabilities use the higher. Maintenance valuation uses the applicable oracle prices and maintenance weights.

The stable price is not a fill guarantee and does not hold the book at a fixed level. It is part of risk accounting.

## Oracle validity is a program check

Oracle readers and configuration define accepted feed formats, confidence bounds, staleness and available fallbacks. A stale or invalid oracle can prevent health-dependent trading, liquidation or vault pricing. Displaying the last cached price does not make that price acceptable to the program.

An oracle can also be wrong while meeting freshness checks. Feed validity checks limit specific failure modes; they do not establish that an external market price is economically correct.

## Quote units in FLP

The current vault values quote cash in its own quote-token units. One USDC remains one USDC in NAV even if its dollar oracle differs from one. Other assets use token-to-quote conversions with conservative bounds. This avoids mixing a dollar valuation with a fixed USDC payout, but it does not remove USDC's external purchasing-power risk.


## Implementation reference

Reviewed at `90267b20`. [oracle.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [oracle_config.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [stable_price.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [nav.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/nav.rs). Source links require access to the implementation repository.
