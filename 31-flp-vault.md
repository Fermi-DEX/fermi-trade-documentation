# FLP: pooled trading with on-chain share accounting

FLP pools USDC in a Fermi trading account. A delegated market maker trades that account. LPs hold non-transferable shares whose value changes with the pool's trading result, funding, fees and other accounting effects.

The vault program controls deposits, shares, exits and recovery. The core exchange still performs matching, health checks, settlement and liquidation. FLP does not turn a risky strategy into a fixed-return deposit.

## Where each balance lives

```text
User USDC
  ├─ public pre-deposit / queued live deposit ──> deposit escrow
  │                                               |
  │                                  graduation / eligible close
  │                                               v
  └─ approved direct deposit ───────────> Fermi trading account
                                                  ↕
                                         authority's idle USDC ATA
                                                  |
                                        funded withdrawal batch
                                                  v
                                          redemption escrow
                                                  |
                                              user claim
```

| Balance | In trading NAV? | Exposure |
| --- | --- | --- |
| Public principal before graduation | No | Refundable quote principal; no strategy PnL |
| Pending or held live deposits in escrow | No | Not yet trading shares; held deposits are refundable |
| Core token/perp positions | Yes | Trading, funding, oracle and core protocol risk |
| Authority's idle quote ATA | Yes | Quote cash, but not collateral in core health |
| Redemption escrow for funded claims | No | Fixed funded claims, outside active trading NAV |

These separations prevent the same cash being counted both as trading equity and as a reserved payout.

## Shares and authority

The share mint uses Token-2022's NonTransferable extension. Shares represent proportional equity under the vault's pricing rules; they are not a transferable stablecoin or a guaranteed 1:1 USDC claim.

The vault authority PDA owns the FermiAccount and signs vault-controlled CPIs. The delegate can trade under core authorization. It cannot choose arbitrary user-claim recipients. Claims and refunds validate the beneficiary's canonical token account.

| Role | Main powers |
| --- | --- |
| Admin | Configure and stage parameters, approve direct depositors, propose delegate, graduate, recover and transfer administration |
| Guardian | Set safety pauses, revoke delegate, cancel orders and initiate supported recovery |
| Delegate | Trade; latest source also permits the guarded deferred-cure operation |
| Fee recipient | Receive fee shares |
| Any caller | Execute supported keeper/claim actions under program checks |
| Program upgrade authority | Change deployed program code; separate from vault parameter timelocks |

Approved deposits do not grant trading authority. Permissionless claims do not let the caller redirect someone else's payout.

## Lifecycle at a glance

```text
initialize + seed → pre-deposit → graduate → live
                         \                  /
                          → recovery ←─────
                              |
                   proportional completion → prior trading phase
                   full completion         → closed → terminal redemption
                   admin abort             → trading phase, deposits paused
```

Closure is permanent once finalized. Current code permits an admin to abort an unfinished unwind; initiating full recovery is therefore distinct from completing closure.

The reviewed source includes recent v3 recovery and capacity extensions. Matching account sizes alone does not authenticate the economic behavior of a deployed binary. See [integration](35-flp-integration.md) before sending transactions.


## Implementation reference

Reviewed at `90267b20`. [state.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/state.rs) · [initialize.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/initialize.rs) · [permissioned.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/permissioned.rs) · [recovery.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/recovery.rs). Source links require access to the implementation repository.
