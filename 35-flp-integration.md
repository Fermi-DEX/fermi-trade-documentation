# Integrating FLP

Pin the vault program, core program, IDL, SDK and economic profile together. The reviewed source uses version-3 vault accounting with recent recovery extensions. Compatible account lengths do not prove that two binaries implement the same behavior.

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

The core trading account derives under the core program using `FermiAccount`, group, authority and the account number. Share ATAs use Token-2022; quote ATAs use the quote token's expected program. Use SDK helpers rather than assuming every ATA uses the same token program.

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

Queued MM intents use the core canonical v5 perp remaining-account helper. Vault CPIs use health accounts for active positions in the core's expected order. Pricing operations additionally supply one event queue per active perp position. Expanded-vault recovery operations place the `RecoveryTargets` sidecar last, where required; the vault strips it before passing core health accounts.

Current expansion supports up to 13 perp slots and 64 open-order slots. Preconditions include paused deposits, no active/pending delegate and no unwind/closed state. New initialization and older expanded-vault flows have distinct ABI entrypoints; use the matching IDL.

## Read API and accounting states

The harness's configured FLP routes are:

```text
GET /state/vaults/:vault
GET /state/vaults/:vault/portfolio
GET /state/vaults/:vault/users/:owner
```

Responses include schema, generated time and source context. An absent user record is not an all-zero history. Missing epoch records or unsupported layouts must make dependent claims unavailable rather than fabricate a zero payout. Preserve large integers as strings/big integers.

Metadata readers have explicitly selected economic profiles. Verify whether the deployed reader exposes the latest recovery/cure/permissioned-withdraw behavior; a legacy profile name or size check is not sufficient certification. Decode current on-chain state with the matching SDK when a reader lacks those fields.

## Keeper transaction handling

Before pricing, consume vault fill/out events. Build the exact FIFO record prefix, health accounts, event queues and optional recovery sidecar. Create fee-recipient token accounts separately where necessary to keep the economic transaction within its limits.

The repository's keeper uses legacy transactions when they fit and a dedicated larger v1 format otherwise. Follow that serializer and deployment support; do not assume adding an ALT solves every layout or packet-size issue.

Persist signed transactions before sending. Re-send identical bytes while their outcome is uncertain; rebuild only after a recorded terminal failure or proof the old transaction expired absent. A lost response is not a failed deposit or withdrawal.


## Implementation reference

Reviewed at `90267b20`. [index.ts](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/sdk/src/index.ts) · [flp_vault.json](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/sdk/idl/flp_vault.json) · [capacity.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/capacity.rs) · [initialize.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/initialize.rs) · [flp-metadata-api.md](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/docs/flp-metadata-api.md) · [transaction_v1.cjs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/operations/transaction_v1.cjs). Source links require access to the implementation repository.
