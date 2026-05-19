# 08 · Funding

Funding is the periodic payment that pegs the perpetual price to the
spot oracle. On Fermi:

- **Direction:** longs pay shorts when the perp trades above oracle;
  shorts pay longs when the perp trades below oracle.
- **Cadence:** continuous accrual. There is no "funding hour" —
  funding accrues every time `perp_update_funding` is called, by an
  amount proportional to the elapsed time and the current
  instantaneous funding rate.
- **Settlement:** automatic. Each time your `perp_position` is
  touched (place, cancel, fill, liquidate, settle), per-lot funding
  delta since the last touch is folded into your
  `quote_position_native`.

## The on-chain formula

From `programs/fermi-v1/src/state/perp_market.rs:311-384`:

```
1. Compute book impact prices:
   bid_lots = bookside(Bid).impact_price(impact_quantity, now_ts, oracle_lots)
   ask_lots = bookside(Ask).impact_price(impact_quantity, now_ts, oracle_lots)

2. Compute the instantaneous funding rate:
   if both sides exist:
     mid_lots     = (bid_lots + ask_lots) / 2
     book_price   = lot_to_native_price(mid_lots)         // I80F48
     funding_rate = (book_price / oracle_price) - 1
     funding_rate = clamp(funding_rate, min_funding, max_funding)
   elif only bids exist:   funding_rate = max_funding
   elif only asks exist:   funding_rate = min_funding
   else:                   funding_rate = 0

3. Cap the elapsed window:
   diff_ts = min(now_ts - funding_last_updated, 3600)     // ≤ 1 hour
   time_factor = diff_ts / 86_400                         // share of a day

4. Per-base-lot quote-native funding to add to both indexes:
   funding_delta = oracle_price × base_lot_size × funding_rate × time_factor

5. Bump cumulative indexes:
   long_funding  += funding_delta
   short_funding += funding_delta
   funding_last_updated = now_ts
```

(Yes, both `long_funding` and `short_funding` get the *same* delta
added — the *sign* of your position determines whether you pay or
receive.)

## Per-position settlement

Each `PerpPosition` tracks the cumulative-funding values it last
saw:

- `long_settled_funding` — the value of `long_funding` at last
  touch
- `short_settled_funding` — the value of `short_funding` at last
  touch

The next time the position is touched, the program subtracts the
unsettled portion (by side) from `quote_position_native`:

```
if base_position_lots > 0:
    quote_position_native -= base_position_lots × (long_funding - long_settled_funding)
    long_settled_funding   = long_funding
elif base_position_lots < 0:
    quote_position_native -= base_position_lots × (short_funding - short_settled_funding)  // negative × positive → adds quote
    short_settled_funding  = short_funding
```

For longs the funding is *paid* (debited from quote), for shorts it
is *received* (credited to quote), assuming `funding_rate > 0`. When
the rate is negative the directions invert.

## Daily / hourly conversions

The constants in the formula are:

| Constant | Value |
|---|---|
| `DAY_I80F48` | `86_400` (seconds per day) |
| `max_funding_timestep` | `3_600` (seconds; one-hour cap on a single update interval) |

Funding rates are configured per-market as **per-day** values:

| Field | Typical | Meaning |
|---|---|---|
| `min_funding` | e.g. `-0.05` | Most negative daily rate (longs receive at most 5 %/day) |
| `max_funding` | e.g. `+0.05` | Most positive daily rate (longs pay at most 5 %/day) |

To convert to other intervals:

```
8h rate ≈ daily_rate / 3
1h rate ≈ daily_rate / 24
1y rate ≈ daily_rate × 365
```

Funding always accrues against `oracle_price × base_lot_size` per
lot, so the **dollar funding per lot per day** is approximately
`oracle_price × base_lot_size × funding_rate`.

## When `update_funding` runs

`perp_update_funding` is permissionless. In production the relayer +
keeper services call it on a tight cadence (every few seconds per
market) so the displayed funding never drifts. It is also implicitly
called inside `perp_place_order` (`perp_place_order.rs:35-48`), so
every trade refreshes funding for that market before matching.

The on-chain code refuses to apply funding if `now_ts ≤
funding_last_updated`, so duplicate calls in the same second are
no-ops. The internal cap at `max_funding_timestep = 3600` protects
against compounding a stale funding rate over a Solana downtime.

## Edge cases

- **Empty book on one side.** If only bids exist, the rate clamps to
  `max_funding`; if only asks, to `min_funding`. This avoids using a
  one-sided "infinite" mid-price.
- **No book at all.** Funding rate = 0 — no payment accrues that
  interval.
- **Solana downtime.** When the chain catches up, the per-update
  interval is capped at one hour, so a 12-hour outage cannot apply
  12 hours of compounded funding in a single tx. (Funding will
  catch up across many subsequent updates.)
- **Reduce-only / force-close markets.** Funding still accrues
  normally; only order placement is restricted.

## Funding history endpoints

The Continuum harness publishes a `PerpUpdateFundingLogV2` event on
every funding refresh:

```
{
  "market_index": 0,
  "long_funding": "...",
  "short_funding": "...",
  "price": "...",            // oracle price
  "stable_price": "...",
  "open_interest": 12345,
  "instantaneous_funding_rate": "0.000028",
  "fees_accrued": "...",
  "fees_settled": "..."
}
```

Stream from the fanout SSE endpoint or query
`GET /events/{market}?type=PerpUpdateFundingLogV2&from=<seq>` for
historical reconstruction.

The trader endpoint
`GET /trader/{authority}/funding-history` aggregates funding paid /
received per position over time — handy for tax and PnL accounting.
