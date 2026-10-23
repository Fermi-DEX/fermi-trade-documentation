# Direct instructions and CPI

Another Solana program can invoke Fermi instructions with the required accounts and signer privileges. A PDA-owned strategy uses `invoke_signed` for the authority seeds it controls. The core still checks group relationships, authorization, instruction gates, health and token destinations.

## Choose the correct path

| Need | Path |
| --- | --- |
| Normal relayed trading | Signed intent through the v5 relayer and AMQ |
| Alternative queued admission | Enabled v5 direct pool with its own signed format |
| Deposits, settlement or supported maintenance | Corresponding core instruction / CPI |
| PDA-controlled vault action | Vault instruction that signs for its own authority PDA and calls the core |

A PDA cannot produce an ordinary Ed25519 private-key signature. Do not assume a PDA owner can use a user-signature protocol without the designated delegate or supported program integration path.

## Direct trading affects the FCFS claim

The reviewed core retains directly callable perp placement and cancellation paths under instruction gates and signer checks. These calls do not automatically consume the relayer's AMQ sequence. If enabled, they can affect the book between queued actions.

A deployment claiming universal queue ordering must therefore identify and constrain all alternative paths, including maintenance and recovery exceptions. The queue code alone establishes FIFO for its own stream. A source-level capability is not evidence that a production group has enabled it.

## FLP authority boundary

The vault authority PDA owns the trading account. The vault program signs deposits, withdrawals, delegation changes and recovery actions for that account. User refunds and claims validate the beneficiary's canonical token account; callers cannot redirect a permissionless claim to themselves.

The MM delegate signs ordinary trade intents where the core's delegate-intent gate is enabled. It is distinct from the vault admin, guardian and upgrade authority.

Use the version-matched SDK to build CPIs and health-account suffixes. Supply only the accounts the ABI expects, in the expected order. Extra recovery sidecars belong to the vault wrapper and must not leak into the core health-account list.


## Implementation reference

Reviewed at `90267b20`. [perp_place_order.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/accounts_ix/perp_place_order.rs) · [perp_place_order.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/instructions/perp_place_order.rs) · [fermi_cpi.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/fermi_cpi.rs) · [common.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/common.rs). Source links require access to the implementation repository.
