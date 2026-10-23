# Risks and limits

Fermi's checks constrain permitted state transitions. They do not guarantee profitable trading, immediate exits or uninterrupted service.

| Risk | Mechanism and consequence |
| --- | --- |
| Leverage and cross-margin | Losses in one position consume shared account collateral and can trigger liquidation |
| Oracle error or unavailability | Incorrect prices can distort valuation; invalid or stale feeds can block health-dependent actions |
| Market liquidity | Orders, stops and recovery IOCs may partially fill or fail to fill |
| Bank liquidity | Positive balances or NAV may not be immediately withdrawable |
| Sequencer / relayer availability | Requests can be refused or delayed before commitment; missing reveal material can block a head |
| Optimistic-state error | A preview can be corrected after chain execution or reconciliation |
| Bounded replay guard | The on-chain duplicate cache does not provide permanent exactly-once admission |
| Administrative control | Pauses, queue recovery, parameters and upgrades can change availability or behavior |
| Shared losses | Bank or perp loss-allocation mechanisms can affect participants beyond the bankrupt account |
| Delegate compromise | An authorized trading key can create losses even when it cannot withdraw to an arbitrary wallet |
| Software and integration errors | Incorrect account lists, units, versions or transaction handling can reject or mis-authorize actions |

## FLP-specific exposure

Public pre-deposit principal stays outside trading until graduation, but still depends on token custody and program behavior. After graduation, LP value moves with the strategy. A requested withdrawal remains equity until its batch is funded; burning the wallet shares does not lock a cash amount.

Recovery sells or reduces inventory under bounded rules. It cannot create a counterparty or bank liquidity. Full closure can reserve cash against negative residual perp PnL and, after the required grace, forfeit positive residual PnL that has not settled.

Non-transferable shares cannot be sold to another user as an alternative exit. An upgrade authority can change program code outside the vault's parameter timelock. Examine the deployed authorities and current configuration when assessing those risks.

For mechanisms and specific boundaries, read [security and invariants](37-security-and-invariants.md).


## Implementation reference

Reviewed at `90267b20`. [execution_queue_v5.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [recovery.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/recovery.rs) · [common.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/common.rs). Source links require access to the implementation repository.
