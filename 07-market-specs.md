# 06 · Perp Market Specs

A `PerpMarket` is the on-chain account that defines one tradable
perpetual contract. It binds together lot sizing, fees, oracle
reference, weights, funding parameters, and the bookside / event-queue
PDAs.

This page is the canonical reference for the **fields** that define a
market and their **typical values** for the live Fermi markets.

## Listed markets (mainnet)

| Symbol | `perp_market_index` | Base / quote | Queue PDA |
|---|---|---|---|
| SOL-PERP | 0 | SOL / USD | `H298eJU5b4uyAHpeeZQdXS9JUttmmaMh2U6RYkUHFfE9` |
| ETH-PERP | 1 | ETH / USD | `764RYGQACUpWqx3dtYUmfG2G3MK6wXT5WPPRHJxzCJQP` |
| BTC-PERP | 2 | BTC / USD | `ArvDdpYTojBbH4FkCxLxALmX3Sb5qr4VsmFFkgV2NSC3` |

Live values for `tick_size`, `min_order_size`, fees, and weights are
returned by `client.getPerpMarkets(group)` and shown in the trading
UI. The fields below explain what they *are*.

## Lot sizes

Lots are the unit of price and size on the book.

- `base_lot_size: i64` (native units of base per lot, e.g. for
  SOL-PERP a `base_lot_size = 100_000` means 1 lot = 0.0001 SOL).
- `quote_lot_size: i64` (native units of quote per lot, e.g. for any
  USD market `quote_lot_size = 100` means 1 lot = $0.0001).
- Both must be a power of 10.

**Conversions** (`perp_market.rs:387-395`):

```
native_price = price_lots × quote_lot_size / base_lot_size

native_quantity (base) = base_lots × base_lot_size
native_quantity (quote) = quote_lots × quote_lot_size
```

The smallest tradable size is `base_lot_size` (in native base);
the smallest tick on the book is the price increment of one
`price_lot`, which depends on the lot ratio. The SDK exposes
`uiPriceToLots`/`uiBaseToLots` helpers so you don't have to do
this arithmetic yourself.

## Fees

| Field | Type | Description |
|---|---|---|
| `maker_fee` | `I80F48` | Fee on the resting side. **May be negative** (rebate). |
| `taker_fee` | `I80F48` | Fee on the crossing side. Must be ≥ 0. |
| `fee_penalty` | `f32` | Fixed quote-native fee charged on every IOC order, posted or not. |
| `settle_fee_flat` | `f32` | Bonus paid to the caller of `perp_settle_pnl` if eligible. |
| `settle_fee_amount_threshold` | `f32` | Settlement amount required to earn the flat fee. |
| `settle_fee_fraction_low_health` | `f32` | Bonus % when the +PnL account has low health. |
| `base_liquidation_fee` | `I80F48` | Liqor's edge on liquidation base trades. |
| `positive_pnl_liquidation_fee` | `I80F48` | Discount applied to settled positive PnL during liquidation. |
| `platform_liquidation_fee` | `I80F48` | Group-owner cut, additional to the liqor fees. |

See [14 - Fees](14-fees.md) for examples and the full computation.

## Weights (perp-specific)

| Field | Description |
|---|---|
| `init_base_asset_weight`, `maint_base_asset_weight` | Weight on long base position when computing health. |
| `init_base_liab_weight`, `maint_base_liab_weight` | Weight on short base position when computing health. |
| `init_overall_asset_weight`, `maint_overall_asset_weight` | Cap on positive perp health contribution; **0 = perp PnL cannot back other positions**. |

If `init_overall_asset_weight == 0`, this market is treated as
**isolated for collateral purposes**: positive unsettled PnL on it
cannot be borrowed against until you settle it via `perp_settle_pnl`.
This is the conservative default for newly listed markets.

## Funding parameters

| Field | Description |
|---|---|
| `min_funding`, `max_funding` | `I80F48` per-day clamp on the instantaneous funding rate. |
| `impact_quantity` | Number of base lots used to compute the impact bid/ask price (the price the order book offers when sweeping that many lots). |
| `long_funding`, `short_funding` | Cumulative funding indexes; per-position deltas accumulate against these. |
| `funding_last_updated` | Last timestamp `update_funding_and_stable_price` ran. |

See [09 - Funding](09-funding.md).

## Settlement parameters

| Field | Description |
|---|---|
| `settle_token_index` | Which token (Bank) settled PnL is denominated in (typically USDC). |
| `settle_pnl_limit_factor` | f32 multiplier for per-window settlement caps. Default `0.2`. Set negative to disable. |
| `settle_pnl_limit_window_size_ts` | Duration of the rate-limit window in seconds. Default `86_400` (24h). |

## Risk modes

| Field | Effect |
|---|---|
| `reduce_only: u8` | If `1`, no order may *increase* a position; only reducing trades pass. |
| `force_close: u8` | If `1`, admin may use `perp_force_close_position` against accounts. Used during retirement. |
| `group_insurance_fund` | If `1`, this market is eligible for insurance-fund payouts on bankruptcy. |

## Oracle binding

Each market references a single oracle account (Pyth, Switchboard, or
Stub). On-chain, the program checks at every place / liquidation /
funding tx:

- `oracle_state.confidence ≤ conf_filter × price`
- `current_slot - last_update_slot ≤ max_staleness_slots`

If either check fails, the call reverts with an oracle error. See
[08 - Pricing](08-pricing-mark-price.md).

## Open interest and seq

- `open_interest: i64` — sum of absolute base lots across all longs
  (= sum across shorts; halve to get one-sided OI).
- `seq_num: u64` — monotonically increasing per-market sequence used
  to construct order IDs (encoded in the upper 64 bits of the order
  key alongside the price).

## Storage

A `PerpMarket` is a fixed-size 2 808-byte zero-copy account
(`const_assert_eq!(size_of::<PerpMarket>(), 2808)` —
`perp_market.rs:247`). Including the Anchor 8-byte discriminator the
total rent is for 2 816 bytes.

## Reading market state programmatically

```ts
const perp = group.getPerpMarketByName('SOL-PERP');

console.log({
  baseLotSize: perp.baseLotSize.toString(),
  quoteLotSize: perp.quoteLotSize.toString(),
  makerFee:    perp.makerFee.toString(),
  takerFee:    perp.takerFee.toString(),
  minFunding:  perp.minFunding.toString(),
  maxFunding:  perp.maxFunding.toString(),
  openInterest:perp.openInterest.toString(),
  oraclePrice: await perp.oraclePrice(connection),
});
```

The CLI equivalent is `cargo run -p fermi-v1-cli -- perp-market-show
--market SOL-PERP`.
