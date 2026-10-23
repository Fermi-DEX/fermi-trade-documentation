# Glossary and units

| Term | Meaning |
| --- | --- |
| AMQ | Asynchronous Market Queue: program state that records actions for later execution in an application-defined order. Fermi v5 uses per-market hash commitments and head-first resolution. |
| CTM signer | Configured authority that signs commitment batches. This name persists in code and wire interfaces. |
| POSq | Fermi's sequencing design. Its arrival-order evidence is separate from the AMQ's enforcement of committed order. |
| Intent | Encoded action plus signed context: accounts, market, timing and identifier. |
| Commit / reveal | Store a binding hash first; later supply the exact preimage for verification and execution. Hashing does not itself encrypt a payload. |
| Sequence | Market-local AMQ position. Different from a book order ID or event-stream cursor. |
| FCFS | First-come-first-served. A claim must name where “come” is measured and what “served” means. |
| Head | Next queue sequence eligible for resolution. |
| Harness / preplay | Local model that applies pending intents to chain-derived state and serves provisional results. |
| Confirmed / finalized | Solana commitment levels. Neither means an unrelated optimistic prediction was correct. |
| FermiAccount | Core account containing a trader's balances, positions and orders. Some SDK identifiers still say Mango. |
| Bank | Token accounting and risk configuration, associated with token custody and deposit/borrow indexes. |
| Oracle / stable price | External reference price / filtered reference used for conservative valuation. |
| Health | Weighted account assets less liabilities under a specified risk model. |
| PnL settlement | Conversion of perp quote value into settlement-token bank balances. |
| Event consumption | Applying on-chain fill/out events to account bookkeeping. |
| FLP | Shares in a pooled trading vault; the shares are Token-2022 non-transferable tokens. |
| NAV | Net asset value in the vault's quote-token units. Low, mid and high valuations serve different purposes. |
| Pricing supply | Minted shares plus owed-but-unminted shares plus locked withdrawal shares. |
| Locked shares | Burned shares whose withdrawal batch is not funded. They still bear vault gains and losses. |
| Funded claim | A withdrawal entitlement backed by cash transferred to redemption escrow. |
| Epoch | Vault accounting interval; distinct from a Solana epoch. |
| Graduation | One-way activation of public pre-deposit capital into trading equity. |
| HWM | High-water mark used to calculate vault performance fees. |
| WAL | Write-ahead log retaining accepted work or signed transaction material for recovery. |

## Price and quantity units

```text
base_native = base_lots × base_lot_size
quote_native = quote_lots × quote_lot_size
native_price = price_lots × quote_lot_size / base_lot_size
human_price = native_price × 10^(base_decimals − quote_decimals)
```

`I80F48` is signed fixed-point arithmetic with 48 fractional bits. UI decimal numbers are presentation values; implementations must preserve integer lots and exact fixed-point conversions.

A slot is a Solana scheduling unit, not a fixed-duration clock. Slot-based expiry and Unix-second order expiry are different fields. Use their actual values rather than converting one into the other with a guaranteed milliseconds-per-slot assumption.


## Implementation reference

Reviewed at `90267b20`. [perp_market.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/state/perp_market.rs) · [math.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/math.rs). Source links require access to the implementation repository.
