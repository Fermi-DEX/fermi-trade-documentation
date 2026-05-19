# 26 · WebSocket / Streams

Fermi exposes streaming via **Server-Sent Events** (SSE) on both
the harness and the fanout. There is no WebSocket server today; SSE
gives equivalent semantics for one-way push streams and is simpler
to operate.

If you need WebSocket-style bidirectional streams (e.g. for `ping`/
`pong` or dynamic subscription), wrap the SSE endpoints with your
own client-side adapter or run a thin WS proxy on top.

## Why SSE (and not WebSocket)?

- **HTTP semantics.** Caching, auth, gzip, HTTP/2 multiplexing all
  work out of the box. Most CDNs proxy SSE without configuration.
- **One-way is enough.** Trader streams are push-only; the client
  doesn't need to send messages mid-stream.
- **Built-in resumption.** Each event has a `seq` field; the client
  reconnects with `?from=<last_seq>` and gets the missed events.

## Subscribing

### From a browser

```js
const url = `${HARNESS_URL}/stream/SOL-PERP?from=now`;
const es  = new EventSource(url);

es.addEventListener('FillLogV3', (e) => {
  const fill = JSON.parse(e.data);
  if (fill.taker === MY_PUBKEY) {
    // ...
  }
});

es.addEventListener('PerpUpdateFundingLogV2', (e) => {
  const f = JSON.parse(e.data);
  console.log('funding', f.instantaneous_funding_rate);
});

es.onerror = () => {
  console.warn('SSE disconnected; browser will auto-reconnect');
};
```

### From Node

```ts
import { EventSource } from 'eventsource';

const es = new EventSource(`${HARNESS_URL}/stream/SOL-PERP?from=now`, {
  headers: { Authorization: `Bearer ${TOKEN}` }, // for fanout
});

es.addEventListener('FillLogV3', (e) => { ... });
```

### From Rust (via `reqwest` + `eventsource-stream`)

```rust
let resp = reqwest::Client::new()
    .get(format!("{}/stream/{}", HARNESS_URL, "SOL-PERP"))
    .send().await?;
let mut stream = resp.bytes_stream().eventsource();
while let Some(event) = stream.next().await {
    match event?.event.as_str() {
        "FillLogV3" => { ... }
        _ => {}
    }
}
```

## Streams catalog

| Path | Per-event types | Useful for |
|---|---|---|
| `/stream/{market}` | `FillLogV3`, `PerpUpdateFundingLogV2`, `PerpTakerTradeLog`, `PerpMakerTradeLog`, `BookSideUpdate`, `OutEvent`, `queue_state` | Per-market firehose. UIs, market data archivers. |
| `/stream/account/{authority}` | Same event types but filtered to events touching this authority's accounts | Per-trader UI dashboards. |
| `/stream/oracles` | `OracleUpdate` | Oracle watchers / pricing services. |
| `/stream/queue/{market}` | `queue_state`, `QueueItemEnqueued`, `QueueItemProcessed` | Relayer / executor health monitoring. |

## Event reference

Every event carries a top-level `seq` (monotonic per stream),
`slot` (Solana slot), and `ts` (server timestamp). The body
varies.

### `FillLogV3`

```json
{
  "market_index": 0,
  "taker_side": "Bid",
  "maker": "...pubkey...",
  "taker": "...pubkey...",
  "maker_slot": 3,
  "maker_client_order_id": 42,
  "taker_client_order_id": 1042,
  "maker_fee": "-0.0002",
  "taker_fee": "0.0004",
  "price": "150.4",
  "quantity": "1",
  "timestamp": 1715810000,
  "seq_num": 12345,
  "maker_timestamp": 1715809980,
  "maker_out": false
}
```

`maker_out: true` indicates this fill consumed the maker order
completely (the leaf was removed and the slot will be freed on
`consume_events`).

### `OutEvent`

```json
{
  "owner": "...",
  "owner_slot": 2,
  "quantity": "0.5",
  "reason": "expired" | "cancelled" | "evicted" | "self_trade_cancel_provide"
}
```

### `PerpUpdateFundingLogV2`

```json
{
  "market_index": 0,
  "long_funding": "...",
  "short_funding": "...",
  "price": "150.42",
  "stable_price": "150.20",
  "open_interest": 12345,
  "instantaneous_funding_rate": "0.000028",
  "fees_accrued": "...",
  "fees_settled": "..."
}
```

### `PerpTakerTradeLog` / `PerpMakerTradeLog`

Aggregated per-tx receipts grouped by side. Includes cumulative
quote_filled, base_filled, fees, and the resulting account state.

### `BookSideUpdate` (delta)

A compact diff of orders added / removed since the last update for
this side.

```json
{
  "market_index": 0,
  "side": "Bid",
  "tree": "Fixed",
  "added":  [{"id":"...","price":"150.5","quantity":"1.0","owner":"..."}],
  "removed":[{"id":"..."}]
}
```

For full snapshots use `GET /state/book/{market}`; the delta stream
is meant to be combined with one initial snapshot.

### `OracleUpdate`

```json
{
  "oracle":  "...pubkey...",
  "kind":    "Pyth",
  "price":   "150.42",
  "confidence": "0.05",
  "last_update_slot": 24123450
}
```

### `queue_state`

```json
{
  "market_index": 0,
  "head": 12350,
  "max_seen": 12352,
  "live_count": 2,
  "first_failure_slot": 0,
  "gap_observed_slot": 0
}
```

Emitted when any of `head`, `max_seen`, `live_count`, or the
failure/gap markers change.

### `QueueItemEnqueued`

A new commit landed in the queue. Indicates the start of an
intent's lifecycle.

```json
{
  "market_index": 0,
  "sequence": 12353,
  "commit_hash_hex": "...",
  "ingress_slot": 24123455,
  "expires_at_slot": 24123555
}
```

### `QueueItemProcessed`

Terminal status for an intent — executed, failed, or autodropped.

```json
{
  "market_index": 0,
  "sequence": 12345,
  "status": "Executed" | "Failed",
  "failure_code": 0,                  // see error code table in [20]
  "tx_signature": "...",
  "completed_slot": 24123460
}
```

## Reconnection / resume

- The `seq` field on every event is the canonical resumption cursor.
- On reconnect, request `?from=<last_seen_seq + 1>`. The harness
  serves backfill from its in-memory ring (last ~10 000 events per
  stream) plus a disk-backed log for older events.
- If `from` is older than the ring's tail, you'll get a single
  `gap` event indicating you missed events; do a full state
  resync via `GET /state/...` and resubscribe with `from=now`.

## Throughput / sizing

Per-market stream rates (rough, observed at peak):

- `FillLogV3`: bursts to ~50/s during fast markets.
- `BookSideUpdate`: hundreds/s during HFT-dominated periods.
- `PerpUpdateFundingLogV2`: every few seconds (keeper cadence).

Plan accordingly: a UI rendering 100 fills/s straight to DOM is
going to lag. Batch by frame (~16 ms) before applying.

## Closing the stream

Standard SSE: close the `EventSource` (browser) or drop the
response stream (Node / Rust). The fanout limits per-key concurrent
streams (default 16) — close ones you no longer need.
