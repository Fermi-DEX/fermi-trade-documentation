# Accounts and delegation

A FermiAccount is the unit of portfolio risk. It belongs to a group and owner, and stores token positions, perp positions, resting-order references and control state. Cross-margin operates within this account. Two accounts owned by the same wallet do not automatically share collateral.

## Ownership and capacity

The account PDA uses the core program's `FermiAccount` seed, group, owner and account number. Use the SDK derivation instead of adapting an older Mango seed by hand. Position arrays have allocated capacity; having collateral does not guarantee that another perp or order slot is available. Account expansion changes storage capacity, not trading permissions or margin.

The group determines the set of banks, markets, oracle configuration and instruction gates. An account from another group is not interchangeable, even when its owner and token mint match.

## Delegation is trading authority

The owner can configure a delegate. Core instructions validate the signer against the current account state. The v5 owner/delegate path additionally depends on `IxGate::V5DelegateIntents`; an older or differently configured deployment may reject delegate-signed intents.

At reveal, authorization is checked again. Removing a delegate can therefore invalidate its pending intents. It does not erase orders already on the book. Cancel those separately, and account for fills that occur before cancellation executes.

A delegate restriction on withdrawing to arbitrary recipients does not bound trading losses. A compromised strategy key can take adverse positions or trade at bad prices within program constraints. FLP's delegate controls and recovery mechanisms reduce this risk but do not provide a principal guarantee.

## Account states that matter

Liquidation, frozen-account rules, reduce-only controls and active health regions affect which actions can succeed. Do not infer usability from a positive wallet balance or from an account existing. Read current account state, group gates and health.

The [SDK workflow](23-sdk.md) explains why account lists used for queued intents differ from the active-position list used for vault CPIs.


## Implementation reference

Reviewed at `90267b20`. [fermi_account.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/state/fermi_account.rs) · [account_create.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/accounts_ix/account_create.rs) · [execution_queue_v5.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/instructions/execution_queue_v5.rs). Source links require access to the implementation repository.
