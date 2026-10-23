# What Fermi does

A perpetual future gives a trader price exposure without owning the underlying asset. Fermi records that exposure as a base position and a quote balance. Traders post collateral, submit orders, and trade against other orders on an on-chain book. Funding transfers value between longs and shorts to relate the perpetual market to its oracle reference.

The essential separation is between **deciding the order of requests**, **executing them**, and **showing the likely result**.

| Component | Responsibility | Authority |
| --- | --- | --- |
| Wallet and client | Construct and sign an exact intent | Authorize the requested action |
| Sequencing / relayer service | Admit requests, allocate market sequences, submit commitments | Controls admission and transaction delivery |
| On-chain AMQ | Store commitments and resolve heads in sequence | Enforces the committed market order |
| On-chain exchange | Match, check health, update positions and accounting | Determines valid economic transitions |
| Executor and keepers | Reveal requests, consume events, update funding, settle and liquidate | Supply transactions; program checks their effects |
| Harness and downstream read services | Preplay and reconcile books, orders, fills and accounts | Provide provisional and chain-derived views |
| FLP vault | Pool USDC and manage shares, deposits and exits | Enforces vault accounting through a separate program |

## Where funds live

Deposited trading tokens sit in program-controlled bank vaults. A FermiAccount records the owner's indexed balances, debts, positions and orders. The wallet remains the authorization source, but deposited assets are subject to program rules, margin, liquidation, bank liquidity and upgrade authority.

FLP adds another layer: a vault PDA owns a FermiAccount, and a delegate trades its inventory. LPs hold non-transferable shares in that pool. Public pre-deposit principal, active trading equity, and funded withdrawal cash have different exposure and live in different places.

## What “fully on-chain execution” means

The relayer cannot make an optimistic fill settle by writing it into a database. The program must accept the signed payload and execute the order against the on-chain book. Fill events, event consumption, funding and PnL settlement are also on-chain operations. A harness prediction can disappear if execution fails or chain state differs.

This does not mean that every system component runs on chain. Admission, sequencing, transaction delivery, keeper scheduling and fast reads rely on off-chain services. Their availability affects users even when the program's accounting checks remain intact.

Continue with [architecture](02-architecture.md) and [security boundaries](37-security-and-invariants.md).


## Implementation reference

Reviewed at `90267b20`. [lib.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [fermi_account.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [lib.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/lib.rs). Source links require access to the implementation repository.
