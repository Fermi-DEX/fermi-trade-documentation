# 24 · HTTP & SSE API (Continuum Harness + Fanout)

The Continuum harness is the read service for Fermi. It maintains a
mirror of every PerpMarket, Bank, FermiAccount, and OrderBook in
the group, applies relayer-accepted intents optimistically, and
serves it over HTTP and Server-Sent Events (SSE).

The fanout service (`:9094`) re-broadcasts the executor's event
stream to many subscribers without overloading the harness's main
process.

## Service ports (default)

| Service | Port | Purpose |
|---|---|---|
| Relayer | 9090 | gRPC `SubmitIntent`, `CancelIntent`, etc. |
| Continuum harness | 9091 | HTTP REST + per-stream SSE |
| HTTP bridge | 9092 | Optional REST → gRPC adapter for the relayer |
| Relayer metrics | 9093 | Prometheus `/metrics`, `/healthz` |
| Fanout | 9094 | HTTP + SSE (auth-required, scaled re-broadcast) |

The hosted endpoints are published in `ts/client/src/ids.json`.

## Authentication

The harness REST endpoints are **read-only and unauthenticated**.
The fanout SSE endpoints accept either:

- `?api_key=<key>` query parameter, or
- `Authorization: Bearer <jwt>` header.

API keys and JWTs are issued by the operator; ask in the support
channel for production access.

## Read endpoints

### `GET /healthz`

Liveness probe.

```json
{"status":"ok","backend":"rust","slot":24123456,"uptime_s":1234}
```

### `GET /config`

Bootstrap constants — program ID, group, banks, perp markets, oracles.
Cache this at startup; refresh on a `config_bump` event.

```json
{
  "program_id": "FRMiKrj2hQGvcZQtSDdiFRZ4cmaTjuc1QVkM2B5ShUvA",
  "group":      "87qUKYQoK1f9gYQjYzw5NcRo7wx6VmfhTGJ7JenoeYAA",
  "perp_markets": [
    { "name": "SOL-PERP", "perp_market_index": 0, ... },
    ...
  ],
  "banks": [...],
  "oracles": [...]
}
```

### `GET /state/markets`

All markets and their current oracle / funding / open interest.

### `GET /state/markets/{market_index}` or `/{symbol}`

Single market with full state.

### `GET /state/users/{authority}` or `/{fermi_account_pubkey}`

Fermi account snapshot. Optional `?view=optimistic|confirmed`
selects the source:

- `confirmed` — latest committed on-chain state. Safe for
  settlement decisions.
- `optimistic` — confirmed + relayer-accepted-not-yet-on-chain
  intents applied. Useful for UIs and bot decision loops.

```json
{
  "owner": "...",
  "account_num": 0,
  "tokens": [...],
  "perp_positions": [...],
  "perp_open_orders": [...],
  "init_health":  "12500.42",
  "maint_health": "13412.10"
}
```

### `GET /state/book/{market}`

Current order book (both Fixed and OraclePegged trees merged):

```json
{
  "bids": [
    { "price": "150.4", "size": "12.5", "owner": "...", "id": "..." },
    ...
  ],
  "asks": [...]
}
```

### `GET /state/oracles`

All oracle prices, confidence intervals, last-update slots.

### `GET /trader/{authority}/state`

Aggregated trader-level state across all sub-accounts:

```json
{
  "accounts": [
    { "account_num": 0, "init_health": "...", "perps": [...] },
    ...
  ],
  "total_collateral_usd": "...",
  "total_unsettled_pnl_usd": "..."
}
```

### `GET /trader/{authority}/pnl`

Realized + unrealized PnL, broken out by market and bucket
(trade vs. funding vs. liquidation).

### `GET /trader/{authority}/trades-history?from=<seq>&limit=200`

Paginated trade history.

### `GET /trader/{authority}/order-history?from=<seq>&limit=200`

Paginated order events (place / cancel / fill / expire).

### `GET /trader/{authority}/funding-history?from=<ts>&to=<ts>`

Funding paid / received per position over a time range.

### `GET /trader/{authority}/collateral-history?from=<ts>&to=<ts>`

Deposit / withdraw / interest events.

### `GET /trace/sequence/{market}/{seq}`

The audit-trail endpoint. Returns every emission point seen for one
sequence — accepted, committed, submitted, revealed, executed,
autodropped — with timestamps, blockhashes, error texts.

This is the canonical "where did my order go" debugging surface.

## SSE endpoints

All SSE endpoints emit a stream of `event:`-typed messages, each
with a JSON `data:` payload.

### `GET /stream/{market}?from=<seq>`

All events for a market: fills, cancellations, funding updates,
oracle updates, queue state changes.

```
event: FillLogV3
data: {"taker":"...","maker":"...","price":"150.4","quantity":"1","taker_fee":"0.06","maker_fee":"-0.03","seq_num":12345}

event: PerpUpdateFundingLogV2
data: {"market_index":0,"long_funding":"...","short_funding":"...","instantaneous_funding_rate":"0.000028"}

event: queue_state
data: {"head":12350,"max_seen":12352,"live_count":2}
```

`from=<seq>` lets you replay from a specific sequence number for
catch-up. `from=now` (default) starts at the live edge.

### `GET /stream/account/{authority}`

Filtered firehose for one trader's account: only events that touch
their `FermiAccount`. Useful for UI dashboards.

### `GET /stream/oracles`

Per-oracle update events.

### `GET /events/{market}?type=<EventName>&from=<seq>&limit=500`

Historical pull (non-streaming) of one event type.

## Snapshot endpoint

`GET /snapshot/{market}` returns the most recent ~1000 events for
the market. Useful for warm-starting a UI without subscribing to
the full SSE stream from sequence 0.

## Fanout (`:9094`)

Same SSE protocol, but with auth and horizontal scaling. The fanout
ingests events from the executor (`POST /ingest`) and re-broadcasts
to all subscribed clients. Use the fanout for production, the
harness for low-volume direct reads.

## Error responses

| HTTP | Cause |
|---|---|
| `400 Bad Request` | Malformed query (e.g. invalid `from=` value). |
| `401 Unauthorized` | Missing or invalid auth on a fanout endpoint. |
| `404 Not Found` | Unknown market / sequence / authority. |
| `429 Too Many Requests` | Per-key rate limit exceeded. |
| `503 Service Unavailable` | Harness still bootstrapping; retry. |

Error bodies are JSON: `{"error": "...", "code": "..."}`.

## Caching and freshness

- The harness updates from on-chain reads continuously; freshness is
  typically `< 1 slot` for confirmed view, immediate for optimistic.
- For ultra-low-latency requirements, consider running your own
  harness instance close to your validator RPC (binary lives at
  `bin/service-fermi-execution-engine` plus `rust-harness/`).
- The fanout service has a max client cap; production deployments
  shard by symbol and round-robin clients across instances.

## Observability

The harness exposes Prometheus metrics on the same port at
`/metrics`. Key gauges:

- `fermi_harness_book_depth{market="SOL-PERP",side="bid"}`
- `fermi_harness_open_interest{market="SOL-PERP"}`
- `fermi_harness_optimistic_lag_slots{market}`
- `fermi_harness_intents_accepted_total{market}`
- `fermi_harness_intents_rejected_total{market,reason}`
- `fermi_harness_sse_subscribers{stream}`
