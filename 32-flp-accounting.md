# FLP NAV, shares and fees

FLP has two separate questions to answer: **what fraction of trading equity belongs to an LP**, and **whether the vault can pay that fraction in cash now**. NAV and share pricing answer the first. Funding checks answer the second.

## NAV is measured in quote-token units

The current implementation values quote cash exactly in quote units. One native USDC unit contributes one native quote unit. For another token, NAV converts token value into quote using token and quote prices. Conservative bounds use opposite ends of the numerator and denominator price intervals and reverse treatment for liabilities.

Perp value includes quote accounting plus signed base exposure at the relevant reference price. The core health representation already incorporates unsettled funding and taker fills. Relevant unconsumed vault maker/out events must be consumed before pricing.

| Valuation | Treatment | Main use |
| --- | --- | --- |
| NAV_mid | Oracle-based value | Graduation conversion and cap accounting |
| NAV_low | Conservative asset/liability bounds; positive perp PnL haircut | Exit pricing, performance fees, breaker |
| NAV_high | Opposite conservative bounds | Entry pricing |

The haircut applies to positive unsettled perp value; losses are not discounted away. Idle quote is included in all NAV views. Deposit and redemption escrows are excluded.

NAV is not core health: idle cash can raise NAV without providing core collateral, and the core applies its own risk weights. Nor is NAV withdrawable cash: unsettled positive PnL can raise NAV while spot USDC is insufficient.

## The supply that pricing uses

```text
S = minted share supply + owed_unminted_shares + locked_shares
```

Minted supply includes seed/dead shares. Owed shares belong to priced deposits or graduation allocations not yet claimed. Locked shares were burned for withdrawals but remain equity until funded.

| Transition | Minted | Owed | Locked | Effect on pricing supply |
| --- | ---: | ---: | ---: | --- |
| Claim a priced deposit | +s | −s | — | None |
| Request a withdrawal | −s | — | +s | None |
| Cancel an eligible withdrawal | +s | — | −s | None |
| Fund a withdrawal batch | — | — | −s | Removes that batch from equity |

Ignoring owed or locked shares would give remaining minted holders too much equity. Claim timing must not change ownership proportions.

## Entry and exit ratios

All quantities below are native integers. Virtual assets `V_A` and virtual shares `V_S` are both `1_000_000`.

```text
deposit shares = floor(net_deposit × (S + V_S) / (NAV_high + V_A))
ordinary gross withdrawal = floor(shares × (NAV_low + V_A) / (S + V_S))
```

Ordinary funding requires positive NAV_low. Virtual assets are pricing offsets, not cash that can pay an insolvent vault. Full-recovery funding uses actual nonnegative equity divided by actual pricing supply without virtual offsets. Terminal redemption uses the frozen `terminal_assets / terminal_supply` ratio.

The seed is real quote capital with non-redeemable dead shares. It is separate from the virtual offsets. The offsets, dead shares and rounding rules address first-depositor/donation economics; they do not cover strategy losses.

## Worked entry and withdrawal

Assume no management/performance accrual, no deposit fee, six decimals, `S = 1,000,000,000` and NAV_low = NAV_high = `1,000,000,000` (1,000 shares and 1,000 USDC). A 100-USDC net deposit buys exactly 100 shares because both virtual offsets are equal. Assets and effective supply become 1,100 each.

A request to withdraw 100 shares burns those tokens and adds 100 to locked shares. Effective supply remains 1,100. If NAV subsequently falls 10% to 990 USDC before funding, the ordinary gross payout is:

```text
floor(100,000,000 × 991,000,000 / 1,101,000,000)
= 90,009,082 native USDC = 90.009082 USDC
```

With a 10-bps withdrawal fee, the queued user's fee is `ceil(90,009,082 × 10 / 10,000) = 90,010`, so the claim pays `89,919,072` native USDC. The request did not preserve a 100-USDC debt. The virtual offsets explain the small difference from exactly 90 USDC before fees.

## Fee accrual order

Management fees mint shares based on effective supply and elapsed seconds:

```text
f = management_bps × dt / (10,000 × 365 × 24 × 60 × 60)
management_shares = floor(S × f / (1 − f))
```

Performance fees then use NAV_low per share after management dilution. Only gains above the vault-level high-water mark are eligible. The calculation converts the fee value into shares so that dilution collects that value. The HWM does not move downward; when the rate is zero it can ratchet upward without charging a fee. Recovery suppresses performance fees and preserves its HWM branch. Pre-graduation performance fees are disabled by policy.

Pricing instructions perform accrual; there is no autonomous timer. This includes epoch close and approved pricing operations such as direct deposits, graduation and the latest approved pre-graduation withdrawal path. Fee-rate changes require same-timestamp accrual before application.

## Rounding and reporting

Deposit shares and gross payouts round down. Queued per-user flow fees round up; aggregate withdrawal reserves use a fee rounded down so the reserve covers the sum of user claims. The latest `permissioned_withdraw` immediate path uses `BatchPayout` and its floor-rounded fee, so do not apply the queued-claim rounding rule to that instruction.

A Depositor's share mirror, average cost basis and realized PnL support reporting. The mint supply, owed/locked counters, tickets and epoch ratios determine claims. In particular, fee shares and rounding dust must not be mistaken for new cash deposits.


## Implementation reference

Reviewed at `90267b20`. [nav.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/nav.rs) · [math.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/math.rs) · [accounting.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/accounting.rs) · [withdraw.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/withdraw.rs) · [permissioned.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/permissioned.rs) · [common.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/common.rs). Source links require access to the implementation repository.
