# FLP deposits and graduation

FLP has three entry paths. The vault mode and wallet approval determine which path applies.

| Entry path | When it applies | When trading exposure starts |
|---|---|---|
| Public pre-deposit | Before graduation | At graduation |
| Approved immediate deposit | The wallet has deposit approval and the path is open | In the successful deposit transaction |
| Queued deposit | After graduation | At the epoch close that accepts the deposit |

## Public pre-deposits

A pre-deposit transfers USDC into the deposit escrow. It does not immediately mint shares or enter the trading pool.
Before graduation, the depositor can refund some or all of that principal through `pre_withdraw`.
The refund does not use the trading share price. A deposit pause does not disable this pre-deposit refund path.

The current minimum deposit is 10 USDC. The vault cap includes other committed capital, so a visible escrow balance does not establish available capacity.

To make a pre-deposit:

1. Select Solana mainnet and the [published vault](37-flp-deployment.md).
2. Read the current vault mode and your wallet availability.
3. Read the [unsettled-PnL disclosure](33-flp-pricing.md#unsettled-pnl).
4. Keep SOL in your wallet for transaction fees and account rent.
5. Submit the pre-deposit through the FLP interface.
6. Verify the transaction result and your refundable principal.

If you want to cancel before graduation, submit the pre-deposit refund transaction.
After graduation, the pre-deposit refund path closes.

## Graduation

Graduation is an administrator transaction. A date in an announcement does not execute graduation on chain.
The program converts the public escrow pool into share entitlements at the current `NAV_mid` entry ratio.
The calculation occurs after fee accrual and before the public principal enters trading assets.
Users claim their shares afterward. Their economic exposure starts at graduation, not at the later claim.

Graduation requires positive withdrawal NAV and the applicable lifecycle checks.
With public principal present, the oracle/stable-price spread must be no more than 200 basis points of `NAV_mid`.
This spread test excludes the positive-PnL haircut. A trading delegate is optional.

Positive unsettled PnL is permitted at graduation. There is no graduation-specific exposure cap.
The graduation event records gross positive unsettled PnL and the public cohort's share percentage.
The [pricing page](33-flp-pricing.md) explains why this matters to a new depositor.

## Approved immediate deposits

The administrator approves a wallet for immediate deposits. This approval does not make that wallet a trading delegate.
A successful deposit mints shares at the current `NAV_high` ratio, after the deposit fee.
The transaction also checks the requested minimum share amount.

Approved entry is not a promise that every transaction will succeed.
Pauses, recovery, price validity, the cap, and other program checks still apply.

## Queued deposits after graduation

A deposit request creates or adds to a ticket for its target epoch.
The USDC remains in escrow until the close accepts it. The close fixes the share allocation at `NAV_high`.
A later claim mints the allocated shares. Waiting to claim does not delay economic entry.

Requests after the cutoff target the next epoch.
A wallet must settle an older ticket before it can create an incompatible new ticket.

Before the applicable cutoff, an eligible ticket can be canceled.
If the close holds deposits instead of accepting them, the ticket becomes refund-only.
Recovery, the cap, or an invalid entry value can cause this result. A refund-only ticket does not receive trading shares.

See [withdrawals and epochs](34-flp-withdrawals.md) for the shared schedule.

Source: [Deployed FLP program](https://github.com/Fermi-DEX/fermi-v1-programs/tree/623f113075bd124948eabac8589bfbe8c53b11e8/flp/programs/flp-vault/src).
