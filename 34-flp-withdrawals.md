# withdrawals and epochs

A withdrawal has three separate steps: request, funding, and claim.
A successful request does not mean that USDC is ready to transfer to the wallet.

## Current schedule

The mainnet epoch lasts 24 hours. The request cutoff is one hour before the scheduled epoch end.
A request before the cutoff targets the current epoch. A later request targets the next epoch.

The ordinary funding window lasts two hours from the scheduled epoch end.
It does not start again when a keeper arrives late.
A late close can advance accounting without making ordinary payouts eligible in that expired window.

These times are not a payout guarantee. Keeper execution, FIFO order, available cash, core bank liquidity, and account health also matter.

## Request a withdrawal

1. Read your available shares and current ticket state.
2. Read the target epoch and its cutoff.
3. Read the indicative exit estimate and its warnings.
4. Submit the withdrawal request.
5. Verify the transaction result and the ticket.

The request burns the wallet tokens and records equivalent shares in an unfunded ticket.
Those shares remain in the economic pricing supply. They continue to gain or lose value until the batch is funded.
The wallet balance alone therefore does not show the complete invested position.

The configured minimum is one share. The program also permits a request for the wallet's entire share balance below that minimum.
A wallet can add shares to a compatible ticket. It must resolve an older incompatible ticket before a new request.

If the ticket remains cancellable before its cutoff, cancellation restores the shares.
After the cutoff, a pending withdrawal is not an immediately refundable cash balance.

## Close and funding

The close processes withdrawal batches in FIFO order. Earlier deferred batches come before later batches.
This is batch ordering by epoch, not a promised rank for each wallet within one batch.

The close can fund eligible batches from idle USDC.
If the batch needs USDC from the Fermi account, a separate funding transaction handles that step.
The core program enforces the actual withdrawal checks. The FLP path also applies its configured post-withdraw health assertion.

Insufficient funds or a failed check can leave the batch deferred.
This does not mean that the ticket disappeared. The [recovery page](35-flp-recovery.md) explains the next paths.

## When the payout is fixed

| Funding path | Price basis |
|---|---|
| Eligible payment during the close | The shared price snapshot for that close |
| `fund_head_v2` during an eligible funding window | Current withdrawal NAV after fee accrual |
| `cure_deferred` | Current withdrawal price, which must be at least the batch's original close price |
| A later eligible close | The new close's shared price snapshot |

Thus, an unfunded withdrawal remains exposed to price changes.
The cure rule does not guarantee that a later close will pay the original price.

After funding, the batch record contains the payout ratio and withdrawal fee.
The required USDC sits in redemption escrow. The funded claim no longer follows trading NAV.

## Claim the USDC

1. Read the ticket state again.
2. If the state is `funded-claimable`, submit the claim transaction.
3. Verify the USDC receipt and the cleared ticket.

An API estimate is not authority to claim. The program reads the funded batch record.
A delayed claim does not require the user to enter another withdrawal queue.

Approved shareholders also use this process during pre-deposit mode.
Public escrow depositors instead use [pre-deposit refunds](32-flp-deposits.md#public-pre-deposits) until graduation.

Source: [Deployed FLP program](https://github.com/Fermi-DEX/fermi-v1-programs/tree/623f113075bd124948eabac8589bfbe8c53b11e8/flp/programs/flp-vault/src).
