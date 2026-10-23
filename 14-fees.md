# Trading, service and vault fees

Fees belong to three different accounting systems. A trade can incur a core protocol fee, transaction/service costs, and—if it is made by an FLP vault—affect the NAV from which vault fees are later calculated.

## Core trading fees

PerpMarket stores maker and taker rates. Taking fees debit perp quote value; a negative maker rate represents a rebate. The on-chain event path records the maker fee information needed for consumption. Read the market accounts for actual rates; the source permits market-specific configuration.

Illustrative rates only: on $10,000 notional, a 0.06% taker fee is $6 and a −0.03% maker rate is a $3 rebate. These numbers are not a verified live fee schedule.

IOC-style immediate orders can also incur a configured flat penalty even when no trade occurs. Liquidation fees, platform liquidation fees, PnL-settlement incentives and token borrowing fees have separate rules. A single maker/taker table does not describe the cost of every action.

## Transaction and relayer costs

Solana transaction fees and rent are different from trading fees. The r9 relayer uses a separate SOL fee-credit ledger for each owner/account pair. `max_fee_lamports` in the submit request is a relayer-local cap; it is not interchangeable with a price limit or an on-chain trading-fee field.

Before retrying an uncertain request, reconcile its identity and transaction state. Signing a new request can create another action and another fee.

## Fund relayer fees with the SDK

Construct `FermiV1FeeClient` with `{ gatewayUrl, apiKey }`. Call `getStatus({ userOwner, fermiAccount, group, market })` for the current deposit address, memo, quote and available credit.

USDC margin and wallet SOL do not automatically fund this ledger. Use the returned deposit address and memo. `depositFeeCredit` sends a real SOL transfer and reports its signature to the gateway. Mainnet callers must set `sourceChain: 'solana-mainnet'`, because the helper's legacy default is devnet.

For a manual deposit, place the memo before the SOL transfer. Report the confirmed transfer with `reportDeposit`, using its actual instruction index. Duplicate reports use the signature and instruction index for deduplication.

Order and cancellation helpers accept `maxFeeLamports: 'AUTO'` or an explicit integer string. This cap is a service preference outside the signed intent digest. Read available credit before submission because concurrent requests can reserve it.

The SDK [fee guide](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/docs/fee-path-end-to-end.md) contains the complete deposit example.

## FLP fees

The vault can charge management and performance fees by minting shares to the fee recipient. This dilutes other shares; it is not a USDC transfer out of the trading account. Deposit and withdrawal fees remain in the vault through entry/exit accounting.

The implementation caps management fees at 300 bps annually, performance fees at 3,000 bps, and each flow fee at 100 bps. These caps are not the configured rates. [FLP accounting](32-flp-accounting.md) explains accrual order, the high-water mark and rounding.

For reporting, separate trade fees, funding, settlement effects, service costs and vault dilution. Combining them into “realized trading PnL” makes reconciliation harder.


## Implementation reference

Protocol reviewed at `90267b20`; standalone SDK references at `5318a579`. [book.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [perp_market.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [bank.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [fees.rs — bin source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/bin) · [math.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/math.rs) · [state.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/state.rs). Source links require access to the implementation repository.
