# Collateral, banks and cash

A token deposit creates a claim recorded in a bank's indexed accounting. The physical tokens sit in the bank vault. Your FermiAccount records your balance, while the bank defines interest, risk weights and withdrawal constraints.

## Indexed balances

For an indexed position `x`, the native balance is:

```text
x ≥ 0: native balance = x × deposit_index
x < 0: native balance = x × borrow_index
```

Deposits and borrows use different indexes. Interest updates change the indexes rather than rewriting every user balance. Rounding and dust handling belong to the program's fixed-point operations; do not reproduce them with JavaScript floating-point numbers.

## Collateral value is not face value

The health engine values deposits with asset weights and borrows with liability weights. Initial health uses conservative oracle/stable-price bounds. Bank concentration settings can make large exposures less useful as collateral or more costly as liabilities.

A simplified example, in human units: 100 tokens at an oracle price of $2 and an initial asset weight of 0.8 contribute $160 before other adjustments. A $200 market value does not imply $200 of borrow capacity.

## A withdrawal needs more than equity

A token withdrawal may be limited by account health, bank liquidity, utilization, net-borrow limits, reduce-only controls and instruction gates. If an action is allowed to borrow, withdrawing more than a positive balance creates debt and must satisfy the additional checks.

FLP funding deliberately checks whether its payout can be made without creating a quote borrow. Positive perp PnL can raise NAV while leaving too little spot quote to pay an LP. Settlement and liquidity are separate from valuation.

## Bank-level losses

Token bankruptcy can reduce a bank's deposit index and therefore affect depositors who did not create the bad debt. Splitting collateral into subaccounts does not isolate a user from the same bank's loss socialization. Perp bankruptcy has a different mechanism; see [bankruptcy](18-bankruptcy-insurance.md).

Supported assets and rates are deployment data. Load the bank accounts rather than relying on a historical token list or a single hard-coded leverage number.


## Implementation reference

Reviewed at `90267b20`. [bank.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [fermi_account_components.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [token_withdraw.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [token_liq_bankruptcy.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs). Source links require access to the implementation repository.
