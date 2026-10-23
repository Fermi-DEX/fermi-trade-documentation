# HTTP state API

Use `FermiV1StateClient` from the standalone SDK. The r9 gateway base URL is `https://v1.fermi.trade/prod`. Every request requires the gateway UUID as `x-api-key`.

```ts
import { FermiV1StateClient } from '@fermilabs/fermi-v1-sdk';

const state = new FermiV1StateClient({
  gatewayUrl: 'https://v1.fermi.trade/prod',
  apiKey: process.env.FERMI_API_KEY!,
});
const config = await state.getConfig();
const market = await state.getMarketState(0, 'confirmed');
const queue = await state.getQueueState(0);
console.log(config, market, queue);
```

## Read methods

| SDK method | Route | Purpose |
| --- | --- | --- |
| `getConfig()` | `/config` | Deployment addresses, lot sizes and current fees |
| `getBootstrap()` | `/state/bootstrap` | Bootstrap configuration |
| `getMarkets(...)` | `/state/markets` | Multiple markets |
| `getMarketState(market, view)` | `/state/markets/:market` | Market data |
| `getMarketStateDetails(market, options)` | `/state/markets/:market` | Market response with its view envelope |
| `getUserState(owner, view)` | `/state/users/:owner` | User state |
| `getOrders({ market, owner, view })` | `/state/orders/:market` | Open orders |
| `getQueueState(market)` | `/state/queue/:market` | Queue observations |
| `getBalances(owner, view)` | `/state/balances/:owner` | Balances |
| `queryTrades(...)`, `getTrades(...)` | `/state/trades`, `/state/trades/:market` | Trade history |
| `getCandles(...)` | `/state/candles/:market` | Candle history |
| `simulateWarm(...)`, `simulate(...)` | `/simulate/warm`, `/simulate` | Provisional trade simulation |

Some helpers unwrap `data`. Preserve the requested view alongside the returned data. Use the detailed response where the application needs the envelope.

## Views and freshness

`optimistic` includes local replay of accepted intents over observed chain state. A later onchain failure can invalidate that preview. `confirmed` uses observed chain outcomes. It is not a promise of finalized state or zero cache delay.

Several helpers default to `optimistic`. Pass `'confirmed'` explicitly for reconciliation. Preserve source, slot, timestamp and view fields where available. Show stale or divergent state as such.

## Gateway boundaries

Normal order submission uses [gRPC](26-api-grpc.md). The SDK also exposes `submitRelayIntent` for the gateway HTTP bridge. Its availability depends on the service deployment.

Internal ingest, lane registration and replay endpoints are operator interfaces. Deprecated aliases in the SDK do not establish public gateway support. `/airdrop` is for enabled test deployments. It does not fund mainnet accounts, and `/airdrop-deposit` is retired.

HTTP 429 produces `RateLimitedError`, with retry metadata when the server supplies it. Backoff and reconciliation remain application responsibilities.

The SDK has no typed FLP read methods at this revision. The [FLP integration page](35-flp-integration.md) distinguishes optional service routes from supported SDK exports.

## SDK reference

Reviewed at `5318a579`. [src/harness.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/harness.ts) · [src/auth.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/auth.ts) · [docs/api.md](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/docs/api.md).
