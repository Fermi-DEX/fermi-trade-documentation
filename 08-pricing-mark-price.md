# 07 · Pricing & Mark Price

Three prices matter on Fermi:

1. **Oracle price** — the spot reference, fetched from Pyth /
   Switchboard / Stub. Used for unrealized PnL and for `maint`
   health.
2. **Stable price** — a slow, growth-clamped filter on the oracle.
   Used to widen the price band for `init` health.
3. **Book mid (impact) price** — the order-book derived price used
   to compute the funding rate.

There is **no separate "mark price" account** on Fermi. The "mark
price" depends on what you're computing:

| Computation | Price used |
|---|---|
| Unsettled PnL | `oracle_price` |
| `maint` health (and `liquidation_end` health) | `oracle_price` |
| `init` health, asset side | `min(oracle_price, stable_price)` |
| `init` health, liability side | `max(oracle_price, stable_price)` |
| Funding rate | book impact-price vs `oracle_price` |
| Liquidation pricing | `oracle_price` adjusted by `base_liquidation_fee` |

## Oracle types supported

- **Pyth** (push and pull, via `PriceUpdateV2` accounts)
- **Switchboard** (V2 aggregator)
- **Stub** (admin-set price; testing only)
- **OrcaCLMM**, **RaydiumCLMM** (concentrated liquidity TWAPs, with a
  500 bps max deviation guard against pool manipulation)

The exact type is set per Bank or per PerpMarket at registration time
and stored in the `oracle` field. Clients can probe it via
`oracle.kind()` or read the on-chain config:

```rust
pub struct OracleConfig {
    pub conf_filter: I80F48,        // max confidence as fraction of price
    pub max_staleness_slots: i64,   // -1 disables staleness check
    pub reserved: [u8; 72],
}
```

*Source: `state/oracle.rs:173-179`.*

## Confidence and staleness checks

Every read goes through `check_confidence_and_maybe_staleness`. The
checks:

```
require!( confidence <= conf_filter × price,         OracleConfidence )
require!( now_slot - last_update_slot <= max_stale,  OracleStale     )
```

If either fails, the entire instruction reverts. There is no fallback
or "use last good price" mode — by design, stale or noisy oracle =
no trading.

The staleness check is *skipped* on a few paths where freshness has
already been validated upstream (e.g. inside a single tx that already
read the oracle). Set `max_staleness_slots = -1` to disable entirely
for an oracle that has its own freshness guarantees.

## Stable price model

The stable price is a non-linear EMA-like filter on the oracle, with
two caps:

- **Per-second growth limit** (`stable_growth_limit`, default 0.03 %)
- **Per-interval growth limit** (`delay_growth_limit`, default 6 % per
  hour) measured against a 24-hour delayed reference.

It updates at most every `min_dt = 10` seconds and is buffered in 24
hourly snapshots. The result is a price that:

- Tracks the oracle on calm markets.
- Refuses to follow short-term spikes (oracle attack resistance).
- Catches up over many minutes / hours, not seconds.

*Source: `state/stable_price.rs:1-186`.*

### Why this matters to traders

Init health uses the *wider* of `(oracle, stable)` for liabilities
and the *narrower* for assets. In practice:

- A flash crash in the oracle does not let you over-borrow against
  collateral; the stable price restrains your borrowing power.
- A flash *pump* in the oracle does not artificially inflate the
  health of your shorts; you still owe at the wider, more
  conservative price.

This is the single biggest reason `init_health > maint_health`: the
band is wider on init.

## Mark price for unrealized PnL

For your perp position, unrealized PnL is **always** marked to oracle:

```
unrealized_pnl_usd
  = quote_position_native (in oracle quote units)
  + base_position_native × oracle_price
```

This is the number you see in the trading UI as "uPnL". Stable price
is *not* used here — only init-health uses it.

## Mark price during liquidation

During `perp_liq_base_or_positive_pnl`, the liquidator transfers base
exposure away from the liqee. The transfer price is `oracle_price`,
adjusted by the liquidation fee:

```
long  reduce: liqor pays  oracle × (1 - base_liquidation_fee - platform_liquidation_fee)
short reduce: liqor pays  oracle × (1 + base_liquidation_fee + platform_liquidation_fee)
```

This gives the liqor a small profit margin and disincentivizes letting
positions go bankrupt. See [17 - Liquidation](17-liquidation.md) for
the full math.

## How to read the oracle in client code

```ts
// TypeScript SDK
const oracle = await perp.oraclePrice(connection);            // I80F48 in quote/base
const stable = perp.stablePriceModel.stable_price;            // f64
const slot   = await connection.getSlot();
```

```rust
// Rust SDK
let state = perp_market.oracle_state(&oracle_acc_infos, Some(now_slot))?;
let oracle_price: I80F48 = state.price;
let confidence:   I80F48 = state.deviation;
```

If you need the impact price (the price the order book would offer to
sweep `impact_quantity` lots), call `bookside.impact_price(qty,
now_ts, oracle_price_lots)` — that's the input to the funding-rate
formula and is exposed on every `PerpUpdateFundingLogV2` event.
