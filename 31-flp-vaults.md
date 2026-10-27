# Vaults

FLP is a pooled liquidity vault for Fermi perpetual markets. Users deposit USDC and receive shares in the vault.
A trading delegate manages the vault account. Gains, losses, funding payments, and trading costs change the value of each share.

A share is a claim on vault assets under the program rules. It is not a fixed USDC balance or a guaranteed return.
FLP shares use Token-2022 and are non-transferable. Users exit through the vault withdrawal process.

## How the vault works

| Component | Purpose |
|---|---|
| FLP program | Controls deposits, shares, withdrawals, fees, and recovery |
| Vault authority | A program-derived address that owns the Fermi trading account |
| Fermi core program | Executes trades and applies margin, health, settlement, and liquidation rules |
| Trading delegate | Signs permitted orders for the vault account |
| Keepers | Submit maintenance, epoch-close, settlement, and payment transactions |
| Reader API | Reports vault state and indicative values |

The delegate can quote perpetual markets and manage positions. The program does not guarantee a market-neutral strategy or a profit.
An external hedge is outside vault NAV unless its assets enter the vault through an allowed transaction.

## Where USDC sits

The vault separates trading assets from deposit and redemption escrows.
Public pre-deposits and queued deposits stay in the deposit escrow until their applicable entry step.
Funded withdrawals stay in the redemption escrow until users claim them.

Idle USDC and the Fermi account form the trading pool. Idle USDC is already part of trading NAV.
Escrow balances are outside trading NAV. If share value includes these balances, it counts assets that belong to another stage of the process.

## Vault lifecycle

| State | Public entry | Public exit |
|---|---|---|
| Pre-deposit | Refundable USDC in escrow | Refund the pre-deposit before graduation |
| Live | Deposit request for an epoch | Withdrawal request, funding, then claim |
| Recovery | New deposits and withdrawal requests are restricted | Existing requests remain subject to recovery and payment rules |
| Closed | No new deposits | Terminal redemption or an existing funded claim |

Approved wallets have a separate immediate-deposit path. Deposit approval does not grant trading authority.
Approved shareholders can use epoch withdrawals before graduation. Public pre-depositors use the refund path until graduation.

## Current deployment

The mainnet vault is version 4, release RC6.1. It was deployed on 26 October 2026.
At the 27 October 2026 observation, it remained in pre-deposit mode with public pre-deposits open.
The [deployment page](37-flp-deployment.md) records the addresses and parameters. The live API reports the current mode.

## Read next

- [Deposits and graduation](32-flp-deposits.md)
- [Share pricing and fees](33-flp-pricing.md)
- [Withdrawals and epochs](34-flp-withdrawals.md)
- [Stressed withdrawals and recovery](35-flp-recovery.md)
- [Permissions and risks](36-flp-permissions-and-risks.md)
- [Deployment and source verification](37-flp-deployment.md)
- [Reader API and integration](38-flp-integration.md)

Source: [Deployed FLP program](https://github.com/Fermi-DEX/fermi-v1-programs/tree/623f113075bd124948eabac8589bfbe8c53b11e8/flp/programs/flp-vault/src).
