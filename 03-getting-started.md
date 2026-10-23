# Getting started on r9

The current client workflow uses [Fermi-v1-sdk](23-sdk.md) and the `fermi-r9-mainnet` preset. Account creation, deposits, withdrawals and orders use real mainnet funds.

## Prepare the client

1. Install the pinned SDK with the [SDK instructions](23-sdk.md).
2. Copy its r9 environment example to `.env`.
3. Set `FERMI_API_KEY`, `USER_KEYPAIR`, and your `CLUSTER_URL`.
4. Remove program and group overrides from older deployments.
5. Run `npm run config` to read current deployment parameters.

`npm run smoke-check` checks RPC, REST, fee and gRPC connectivity. It submits an invalid intent as a probe. It does not place an order.

## Create and fund an account

The wallet needs SOL for rent and transaction fees. It also needs mainnet USDC in its associated token account.

```bash
FERMI_ACCOUNT_NAME=my-account npm run create-fermi-account
```

Copy `fermi_account` from the output into `FERMI_ACCOUNT_PK` in `.env`. If the selected account number already exists, the command stops with its address.

Default capacities are one token slot, zero Serum3 slots, three perp slots and 32 open-order slots. r9 requires `FERMI_ACCOUNT_SERUM3_COUNT=0`.

This command transfers real USDC from the wallet to the account:

```bash
USDC_AMOUNT_UI=5 npm run deposit-usdc
```

The command does not mint USDC or create a missing trading account. `5` means five USDC, not five native units.

## Read balances and fund service fees

```bash
OWNER=<wallet-public-key> npm run portfolio
npm run onchain-portfolio
```

`portfolio` reads gateway state. `onchain-portfolio` reads Solana RPC and requires `FERMI_ACCOUNT_PK`.

Relayer fee credit is separate from USDC margin and wallet SOL. Read and fund that ledger through `FermiV1FeeClient`. The [fee instructions](14-fees.md) explain the deposit address, memo and mainnet chain label.

## Simulate and trade

This command reads a simulation after warming its cache:

```bash
SIMULATE_OWNER=<wallet-public-key> SIMULATE_MARKET=SOL-PERP \
  SIMULATE_SIDE=buy SIMULATE_QUANTITY=0.01 SIMULATE_PRICE=80 npm run simulate
```

A simulation does not submit an order or guarantee later execution. The [trader workflow](22-trader-workflow.md) shows explicit placement and cancellation.

The r9 market indices are `0` for SOL-PERP, `1` for ETH-PERP and `2` for BTC-PERP. Read current lot sizes and fees from `/config`.

## Withdraw collateral

This command transfers real USDC to the owner ATA, subject to account health:

```bash
USDC_AMOUNT_UI=5 WITHDRAW_ALLOW_BORROW=false npm run withdraw-usdc
```

The command creates the destination ATA if necessary. Open orders, positions and account health can limit withdrawals. A failed withdrawal does not establish a zero balance.

## SDK reference

Reviewed at `5318a579`. [USAGE.md](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/USAGE.md) · [src/bin/create-fermi-account.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/bin/create-fermi-account.ts) · [src/bin/deposit-usdc.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/bin/deposit-usdc.ts) · [src/bin/withdraw-usdc.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/bin/withdraw-usdc.ts).
