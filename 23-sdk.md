# SDK and version compatibility

Use clients built from the implementation revision that matches the target program and service schema. The repository retains Mango-derived package and type names; renaming an import to “Fermi” does not make an older package compatible.

| Surface | Source |
| --- | --- |
| Core TypeScript client | `ts/client/src/client.ts` |
| Intent encoding and hashing | `ts/client/src/executionQueue.ts` |
| Queue account decoding | `ts/client/src/executionQueueLayout.ts` |
| Core IDL / generated types | `ts/client/src/mango_v4.ts` |
| Rust clients | `lib/client` |
| Relayer protobuf | `ts/client/scripts/execution-queue/ctm_sequencer.proto` |
| FLP TypeScript SDK | `flp-vault/sdk` |

The root package at the reviewed commit is named `@blockworks-foundation/mango-v4`. Do not assume that installing an upstream package with that name gives this fork's v5 or FLP changes. Pin a reviewed build or source revision supplied for the deployment.

## Canonical account lists

For relayed v5 perp intents, use `MangoClient.buildExecutionQueueCanonicalPerpRemainingAccounts`. Its health suffix includes the configured perp markets in canonical order along with banks, oracles and other required account types. Do not construct a target-market-only suffix.

For vault instructions that directly CPI into the core, use the active-position health-account construction expected by that instruction. Pricing paths additionally require event queues; expanded recovery paths require the sidecar last. The lists serve different protocols and cannot be exchanged wholesale.

## Safe numeric handling

Use integer/native amounts and fixed-point types for signing and decoding. Keep `u64` values as big integers or decimal strings across JSON boundaries. JavaScript `Number` cannot represent every `u64` exactly. Convert to human units only at presentation boundaries.

## Transaction construction

Simulate against the target deployment, check account privileges and transaction size, then submit. An address lookup table helps only when the selected transaction format and program path support it. The larger vault keeper transaction path in this repository has its own serializer and limits; do not assume it behaves like an ordinary v0 transaction.

Validate hashes against the repository's fixtures and inspect the exact ABI before upgrading a client. The SDK is a construction tool; on-chain checks remain authoritative.


## Implementation reference

Reviewed at `90267b20`. [package.json](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/package.json) · [client.ts](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/ts/client/src/client.ts) · [executionQueue.ts](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/ts/client/src/executionQueue.ts) · [executionQueueLayout.ts](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/ts/client/src/executionQueueLayout.ts) · [index.ts](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/sdk/src/index.ts). Source links require access to the implementation repository.
