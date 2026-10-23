# Security boundaries and accounting invariants

The core security argument is that economic state changes require program-validated transitions. The relayer, harness and keepers can influence availability and timing, but their database records are not sufficient authorization to move funds or create a settled fill.

That argument depends on the deployed program and its authorities. It is not a claim that the implementation is bug-free or that all entry paths share the same ordering policy.

## Boundary matrix

| Boundary | Enforced mechanism | Remaining assumption or limitation |
| --- | --- | --- |
| User → relayer | Signed canonical intent | User signs the intended bytes, units and accounts |
| CTM → queue | Authorized batch signature and sequence-window checks | Admission and sequence assignment are not independently proved by a VDF in this path |
| Reveal → dispatch | Commitment, account shape, signature/current authorization and timing checks | Correct implementation and available reveal data |
| Queue head → next item | Head state and resolution rules | Gaps, terminal failures and admin reclaim can remove work |
| Trading → collateral | Core health, oracle and account checks | Valid feeds, liquidity and timely liquidation |
| Harness → client | View and reconciliation logic | Preview can be stale or wrong; client must preserve uncertainty |
| Vault → user payout | Ticket/record checks and canonical beneficiary ATA | Correct deployed vault code and token behavior |
| Vault configuration → operation | Roles, timelocks and safety states | Upgrade authority is separate |

## Intent integrity and replay

A payload or account-meta substitution changes the commitment. Current delegate authorization prevents an old delegate from relying solely on a previously valid signature after revocation. Canonical runtime privileges matter as much as addresses.

The consumed-hash cache is finite and time-bounded. It reduces duplicate execution within its effective retention; it does not prove permanent exactly-once admission. Expiry policy, durable service records and client retry discipline remain part of the system.

## Economic accounting checks

| Invariant to reconcile | Why it matters |
| --- | --- |
| Indexed balances use the correct deposit/borrow index | Avoids treating debt like a deposit |
| Pending fills/funding enter risk calculations | Prevents stale stored fields understating exposure |
| Perp value is separate from settled bank cash | Prevents treating an unrealized claim as immediately withdrawable tokens |
| FLP supply includes minted, owed and locked shares | Prevents claim timing or burned withdrawal tokens redistributing equity |
| Deposit/redemption escrows are excluded from active NAV | Prevents double counting principal or funded claims |
| One close uses a post-fee, pre-flow price | Prevents earlier flows repricing later batches in that close |
| Deferred withdrawals remain equity until funded | Prevents turning unfunded exits into senior fixed debts |
| FIFO funding stops at the first unfundable batch | Prevents passing older deferred withdrawals |
| Pricing rejects relevant unconsumed vault events | Prevents stale maker accounting transferring LP value |
| Full recovery excludes forfeited positive PnL and reserves negative residual cash | Prevents paying out value needed for liabilities or not collectible |

These are mechanisms and reconciliation targets, not a blanket proof that every reachable state is correct. The repository includes unit, integration, regression and formal-model work; those artifacts have scopes and assumptions. Their existence does not establish a complete audit of the latest deployed system.

## Availability is part of practical safety

A missing reveal can block a market head. Delayed event consumption can block vault pricing. Late closes can miss a funding window. A paused direct pool cannot provide fallback. Monitor economic progress rather than only process uptime.

Recovery authorities are powerful. Queue admins can discard a head under pause rules; vault admins/guardians can revoke trading or initiate recovery; program upgrade authorities can change logic. Document who controls these roles in each deployment.

## What this review established

This rewrite traced current source behavior and corrected unsupported or stale explanations. It did not independently attest live binaries, run a new adversarial campaign, or certify the POSq cryptographic implementation. [The source review record](38-source-and-review.md) identifies the evidence boundary and the material corrections.


## Implementation reference

Reviewed at `90267b20`. [execution_queue_v5.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [execution_queue_v5.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [cache.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [accounting.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/accounting.rs) · [close_epoch.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/close_epoch.rs) · [common.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/common.rs). Source links require access to the implementation repository.
