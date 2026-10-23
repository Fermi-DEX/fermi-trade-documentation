# Getting started

Before depositing, identify the deployment you intend to use. A program address, group, market index and RPC cluster form one configuration. Mixing addresses from different releases can produce invalid accounts or signatures.

## Prepare an account

1. Obtain the current deployment configuration from the operator. Check the program owner and executable status through your RPC, then load the group and market accounts.
2. Connect a wallet with SOL for transaction fees and account rent. Use a separate trading key if you delegate trading.
3. Create a FermiAccount for that owner and account number. Allocate enough token, perp and open-order slots for the intended strategy.
4. Deposit a supported token through the core program. The deposit creates an indexed bank balance; it is not a transfer to the relayer.
5. Read initial and maintenance health before placing an order.

There is no universal minimum SOL balance or static market-address table in these docs. Rent, account size, fees, markets and service URLs depend on the deployment. A historical configuration in the repository is evidence about that release, not a live discovery service.

## Place a first order

Use a small limit order with an explicit size and price bound. Build the canonical account list with the matching SDK version, sign the intent, and submit it to the relayer. Store the returned market sequence, signed bytes, commitment hash and transaction signatures.

Display the state in stages: submitted, accepted, committed, executed or failed, and confirmed. An optimistic fill can be useful feedback, but it is not sufficient evidence to hedge or withdraw without accepting reconciliation risk.

For a resting order, cancellation is another action. A cancel submitted after an earlier taking order cannot retroactively prevent that trade. Check the cancel result and residual position.

## Exit cleanly

Cancel resting orders, close base exposure, consume pending fill events, settle remaining perp PnL when possible, then withdraw available collateral. A zero base position alone does not imply zero funding, PnL, debt or open-order state.

For local development, the implementation repository provides `startup_local.sh` and execution-queue bootstrap scripts. On devnet, test-token funding and a core deposit are separate steps. Test tokens have no mainnet value.

FLP users should start with [the vault lifecycle](33-flp-lifecycle.md): a public pre-deposit and a live trading deposit have different consequences.


## Implementation reference

Reviewed at `90267b20`. [README.md](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/README.md) · [client.ts](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/ts/client/src/client.ts). Source links require access to the implementation repository.
