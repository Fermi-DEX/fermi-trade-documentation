# Integrating FLP

The standalone [Fermi-v1-sdk](23-sdk.md) is the client source. At `5318a579`, it has no FLP transaction builders, vault decoders or typed vault read methods. The clients inside `fermi-v1`, including its old vault SDK, are deprecated.

This chapter describes protocol integration requirements, not a supported FLP SDK recipe. Do not substitute core collateral deposit or withdrawal helpers for FLP share operations.

Pin the vault program, core program, ABI and economic profile together. The reviewed source uses version-3 vault accounting with recent recovery extensions. Compatible account lengths do not prove that two binaries implement the same behavior.

## Derive the right accounts

| Account | Vault-program seeds |
| --- | --- |
| Vault | `flp-vault`, group, vault ID as little-endian u16 |
| Authority | `flp-authority`, vault |
| Share mint | `flp-shares`, vault |
| Deposit escrow | `flp-escrow`, vault, `dep` |
| Redemption escrow | `flp-escrow`, vault, `red` |
| Depositor | `flp-user`, vault, wallet |
| EpochRecord | `flp-epoch`, vault, epoch as little-endian u64 |
| Expanded recovery targets | `flp-recovery`, vault |

The core trading account derives under the core program using `FermiAccount`, group, authority and the account number. Share ATAs use Token-2022; quote ATAs use the quote token's expected program. Select the token program from the deployed mint and instruction ABI for each ATA.

## Select the economic action

| User state | Action |
| --- | --- |
| Public, pre-graduation | Pre-deposit or principal refund |
| Approved capital entering trading | Explicit permissioned deposit with minimum shares |
| Approved pre-graduation holder exiting | Latest permissioned withdrawal, if its special conditions hold |
| Public live deposit | Request, wait for pricing, then claim or refund if held |
| Live share exit | Request, wait for FIFO funding, then claim |
| Closed vault | Terminal redeem; separately claim existing funded tickets |

Refresh lifecycle state before building. A public helper should not accidentally route an approved treasury operation into principal escrow. `init_depositor` creates a record without granting deposit approval and is available for holders such as fee recipients.

## Account suffixes

Queued MM intents use `buildCanonicalPerpRemainingAccounts` from the standalone SDK. Vault CPIs use health accounts for active positions in the core's expected order. Pricing operations additionally supply one event queue per active perp position. Expanded-vault recovery operations place the `RecoveryTargets` sidecar last, where required; the vault strips it before passing core health accounts.

Current expansion supports up to 13 perp slots and 64 open-order slots. Preconditions include paused deposits, no active/pending delegate and no unwind/closed state. New initialization and older expanded-vault flows have distinct ABI entrypoints; use the matching IDL.

## Read API and accounting states

The harness's configured FLP routes are:

```text
GET /state/vaults/:vault
GET /state/vaults/:vault/portfolio
GET /state/vaults/:vault/users/:owner
```

Responses include schema, generated time and source context. An absent user record is not an all-zero history. Missing epoch records or unsupported layouts must make dependent claims unavailable rather than fabricate a zero payout. Preserve large integers as strings/big integers.

Metadata readers have explicitly selected economic profiles. Verify whether the deployed reader exposes the latest recovery/cure/permissioned-withdraw behavior; a legacy profile name or size check is not sufficient certification. If a reader lacks those fields, use a decoder matched to the deployed vault ABI. The reviewed standalone SDK does not supply one.

## Keeper transaction handling

Before pricing, consume vault fill/out events. Build the exact FIFO record prefix, health accounts, event queues and optional recovery sidecar. Create fee-recipient token accounts separately where necessary to keep the economic transaction within its limits.

The repository's keeper uses legacy transactions when they fit and a dedicated larger v1 format otherwise. Follow that serializer and deployment support; do not assume adding an ALT solves every layout or packet-size issue.

Persist signed transactions before sending. Re-send identical bytes while their outcome is uncertain; rebuild only after a recorded terminal failure or proof the old transaction expired absent. A lost response is not a failed deposit or withdrawal.


## Implementation reference

Protocol reviewed at `90267b20`; standalone SDK references at `5318a579`. [capacity.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/capacity.rs) · [initialize.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/initialize.rs) · [flp-metadata-api.md](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/docs/flp-metadata-api.md) · [transaction_v1.cjs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/operations/transaction_v1.cjs). Source links require access to the implementation repository.


## SDK reference

Reviewed at `5318a579`. [src/index.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/index.ts).
