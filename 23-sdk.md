# SDK and r9 compatibility

[Fermi-v1-sdk](https://github.com/Fermi-DEX/Fermi-v1-sdk) is the source for supported client usage. Clients inside `fermi-v1` are deprecated. The protocol repository remains the source for onchain logic.

The reviewed SDK is `@fermilabs/fermi-v1-sdk` version `0.2.0`, at commit `5318a579`. It bundles the r9 IDL and supports Node.js 22 or later. Its package is private, so these instructions use a pinned source checkout rather than assume a public registry release.

## Install a pinned build

```bash
git clone https://github.com/Fermi-DEX/Fermi-v1-sdk.git
cd Fermi-v1-sdk
git checkout 5318a579dbb10ea34c182df9330a631a8aea2197
npm install
npm run validate
cp .env.fermi-r9-mainnet.example .env
```

The install hook builds `dist/`. For another local application, install the checkout with `npm install /absolute/path/to/Fermi-v1-sdk`. Imports use `@fermilabs/fermi-v1-sdk`.

## Configure r9

| Configuration | Value or purpose |
| --- | --- |
| `FERMI_DEPLOYMENT` | `fermi-r9-mainnet` |
| Program | `FRMiX94PWHbndvySq8xyRx185GvPeggUeKaLmZgVdd4` |
| Group | `2mDvxS4A6bJyR3RjLwvBWeNuFvCAaQ26ss7w1jUChRse` |
| `FERMI_API_URL` | `https://v1.fermi.trade/prod` for REST and SSE |
| `FERMI_API_GRPC_ADDR` | `v1.fermi.trade:443`, with TLS |
| `FERMI_API_KEY` | Gateway UUID from the operator |
| `CLUSTER_URL` | Your mainnet Solana RPC endpoint |
| `USER_KEYPAIR` | Absolute path to the signing wallet file |
| `FERMI_ACCOUNT_PK` | r9 Fermi account address |
| `FERMI_ACCOUNT_NUM` | Account number for creation and owner lookup, default `0` |

The preset supplies program, group, token and gateway values. Remove stale environment overrides before using it. The SDK ignores `HARNESS_URL`, `RELAYER_ADDR`, and `FEE_HTTP_URL`.

REST and SSE use `x-api-key`. gRPC uses the same key in metadata. Solana RPC uses its own endpoint. `FermiV1AccountClient` does not need a gateway key, but `createFermiV1Context` requires one.

These addresses come from the SDK registry, not a new deployment attestation. Read `getConfig()` or run `npm run config` for current market parameters and fees.

## Choose an interface

| Task | Export or source |
| --- | --- |
| Create and read accounts, deposit or withdraw collateral | `FermiV1AccountClient` |
| Derive the account PDA | `findFermiV1AccountPda` |
| Load trading state and signer context | `createFermiV1Context` |
| Submit and cancel orders | `submitPerpOrderViaRelayer`, `cancelPerpOrderByClientIdViaRelayer`, `cancelAllPerpOrdersViaRelayer` |
| Read market, account and queue state | `FermiV1StateClient` |
| Read and fund relayer fees | `FermiV1FeeClient`, `depositFeeCredit` |
| Build signed payloads and direct instructions | `src/intents.ts` |
| Build canonical perp account metas | `buildCanonicalPerpRemainingAccounts` |
| Subscribe to market events | `snapshotAndStreamMarket`, `subscribeMarketEvents` |
| Inspect the gRPC contract | `proto/ctm_sequencer.proto` |

## Account identity and IDL

Use `FermiV1AccountClient.connect` with the r9 program ID. Use `getFermiAccount`, `getFermiAccountForOwner`, and `createFermiAccount` for account operations. The PDA seed and account discriminator use `FermiAccount`.

For typed Anchor access, use `client.fermiProgram.account.fermiAccount`. For decoding, use `client.fermiProgram.coder.accounts.decode('fermiAccount', data)`. Exports include `FERMI_V1_IDL`, `FermiV1Idl`, `FermiV1Account`, and `FermiV1Group`.

The bundled IDL snapshot predates v5 queue instructions. The SDK constructs those instructions with explicit wire encoders in `src/intents.ts`. An IDL rename does not change signed-message domains. Keep the exact domains in [AMQ authorization](20-execution-queue.md) and [direct submission](21-direct-fallback.md).

## Account lists and numbers

The order helpers call `buildCanonicalPerpRemainingAccounts`. This helper includes all configured perp markets in index order, plus the required banks, oracles and account types. A target-market-only health suffix is insufficient.

High-level order helpers accept UI price and quantity. They convert those values to lots. Select explicit price, size, order type and self-trade behavior. Use `bigint` for low-level integer inputs and IDs. Keep wire `uint64` values as decimal strings across JSON boundaries.

The SDK does not export FLP transaction builders or a general onchain CPI library at this revision. Core queued-order account lists do not replace vault health suffixes. See [FLP integration](35-flp-integration.md) for that boundary.

## Supported surface

The SDK supports relayed placement and cancellation. Its published protobuf does not expose trigger-order fields. Service-side trigger code does not establish a supported SDK workflow.

The r9 preset marks direct pools as uninitialized. Direct helpers reject that preset. Prepared custom deployments can use direct helpers with an explicit program and group. See [direct submission](21-direct-fallback.md).

The SDK constructs requests. Onchain authorization, health and accounting checks determine whether they execute.

## SDK reference

Reviewed at `5318a579`. [package.json](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/package.json) · [src/index.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/index.ts) · [src/accountClient.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/accountClient.ts) · [src/context.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/context.ts) · [src/intents.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/intents.ts) · [src/deployments.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/deployments.ts) · [docs/r9-migration.md](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/docs/r9-migration.md).
