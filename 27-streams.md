# Streams and reconciliation

The SDK exposes authenticated SSE subscriptions and a WebSocket tick subscription. These client feeds differ from the upstream Solana RPC or LaserStream inputs that the harness consumes.

## Start from a snapshot

```ts
import {
  snapshotAndStreamMarket,
  subscribeMarketEvents,
} from '@fermilabs/fermi-v1-sdk';

const common = {
  gatewayUrl: 'https://v1.fermi.trade/prod',
  apiKey: process.env.FERMI_API_KEY!,
};
const snapshot = await snapshotAndStreamMarket({ ...common, market: 0 });
let cursor = snapshot.cursor;
// Apply snapshot.snapshot before processing subsequent frames.
const stream = subscribeMarketEvents({ ...common, market: 0, from: cursor });
try {
  for await (const frame of stream) {
    // Apply the event idempotently before persisting its cursor.
    console.log(frame.event, frame.data);
    if (frame.id) cursor = frame.id;
  }
} finally {
  stream.close();
}
```

The snapshot endpoint returns a book and cursor together. The event endpoint accepts `from` or `lastEventId` for bounded backfill. Persist the cursor only after the application processes its event.

The SDK opens one connection per subscription. It does not automatically reconnect. After disconnection, create another subscription with the saved cursor. If retained history cannot cover the gap, fetch a fresh snapshot.

## Available subscriptions

| Helper | Endpoint |
| --- | --- |
| `subscribeStateStream` | `/state/stream` |
| `subscribeFrontendStream` | `/state/stream/frontend` |
| `subscribeTradeStream` | `/state/stream/trades` |
| `subscribeV2TradeStream` | `/v2/stream/trades` |
| `subscribeMarketEvents` | `/v2/events/:market` |
| `subscribeMarketFrontendStream` | `/v2/stream/frontend/:market` |
| `snapshotAndStreamMarket` | `/v2/events/snapshot-and-stream/:market` |
| `subscribeTicks` | Explicit `wsUrl`, such as `wss://v1.fermi.trade/ws/ticks` |

`subscribeFrontendStream` requires at least one of `owner`, `fermiAccount`, or `market`. SSE helpers send `x-api-key`. `subscribeTicks` supplies the key through the `api_key` URL parameter. Do not expose authenticated URLs in logs.

Subscriptions are async iterables with `close()`. They also accept an abort signal. HTTP 429 surfaces as `RateLimitedError`. The application manages backoff and reconnection.

## Reconcile state

An optimistic fill is a local model result. A chain fill records an onchain match. Neither a stream cursor nor a queue sequence is a finality certificate.

Apply events idempotently. Reconcile provisional and chain events by identity and status, so the same fill does not count twice. Replace invalidated provisional state instead of adding a second economic result.

A Redis cursor, market queue sequence and transaction signature identify different objects. Preserve each in its own field. Monitor the last useful event and observed slot, not only socket liveness.

## SDK reference

Reviewed at `5318a579`. [src/streams.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/streams.ts) · [USAGE.md](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/USAGE.md).
