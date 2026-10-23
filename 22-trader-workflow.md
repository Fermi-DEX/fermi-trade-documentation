# Trader workflow

An order has several distinct stages: signed intent, relayer acceptance, onchain queue resolution, matching, event consumption and settlement. A successful API call does not establish a fill.

## Submit through the SDK

This Node.js example submits a real order. It assumes an existing funded r9 account, gateway key and relayer fee credit.

```ts
import { randomBytes } from 'node:crypto';
import {
  createFermiV1Context,
  FermiV1RelayerClient,
  FermiV1StateClient,
  PerpOrderSide,
  PerpOrderType,
  PerpSelfTradeBehavior,
  submitPerpOrderViaRelayer,
} from '@fermilabs/fermi-v1-sdk';

const apiKey = process.env.FERMI_API_KEY!;
const context = await createFermiV1Context({
  deployment: 'fermi-r9-mainnet',
  clusterUrl: process.env.CLUSTER_URL,
  apiKey,
  userKeypair: process.env.USER_KEYPAIR!,
  fermiAccountPk: process.env.FERMI_ACCOUNT_PK!,
});
const state = new FermiV1StateClient({
  gatewayUrl: 'https://v1.fermi.trade/prod', apiKey,
});
const relayer = new FermiV1RelayerClient({
  gatewayGrpcAddr: 'v1.fermi.trade:443', apiKey,
});
const clientOrderId = BigInt(`0x${randomBytes(8).toString('hex')}`);
// Persist this ID and the intended action before submission.
try {
  const accepted = await submitPerpOrderViaRelayer(relayer, context, {
    marketIndex: 0,
    side: PerpOrderSide.bid,
    price: 80,
    quantity: 0.01,
    clientOrderId,
    orderType: PerpOrderType.postOnly,
    selfTradeBehavior: PerpSelfTradeBehavior.decrementTake,
    maxFeeLamports: 'AUTO',
  });
  console.log(accepted.sequence, accepted.tx_signature);
  console.log(await state.getOrders({
    market: 0, owner: context.user.publicKey, view: 'confirmed',
  }));
} finally {
  relayer.close();
}
```

The immediate read can precede execution. Continue reconciliation through queue state, orders, trades and chain transaction status. An absent open order can mean rejection, cancellation or a completed fill.

Price and quantity use UI units. The helper builds canonical account metas, converts to lots, signs the digest and submits through gRPC. Supported order types include `limit`, `ioc`, `postOnly`, `market`, and `postOnlySlide`.

Relayed timing defaults are `minExecuteSlot=0` and `expiresAtSlot=0`. These defaults do not provide permanent replay protection. The high-level helper returns the relayer response, not a durable copy of the signed request.

## Cancel an order

These calls submit real cancellation intents. They reuse the context and an open relayer client from the placement example.

```ts
import {
  cancelPerpOrderByClientIdViaRelayer,
  cancelAllPerpOrdersViaRelayer,
} from '@fermilabs/fermi-v1-sdk';

await cancelPerpOrderByClientIdViaRelayer(relayer, context, {
  marketIndex: 0,
  clientOrderId,
  maxFeeLamports: 'AUTO',
});
// Alternatively, cancel the account's orders in this market:
await cancelAllPerpOrdersViaRelayer(relayer, context, { marketIndex: 0 });
```

Cancellation must reach execution before the competing fill to prevent it. Cancellation acceptance does not undo an earlier fill.

## Recover from uncertainty

Persist the intended action, client order ID, market and returned sequence/signature. For durable signed-request storage, build with the exports in `src/intents.ts` and submit through `relayer.submitIntent`.

After a timeout, reconcile the known identity before another submission. Calling the high-level helper again can create a new random ID. A new ID authorizes another action. Reusing an ID does not establish permanent idempotency because the onchain replay cache is bounded.

Use optimistic state for responsive feedback with a visible status. Use chain-derived evidence for accounting and final reconciliation. HTTP 429 and gRPC `RESOURCE_EXHAUSTED` surface as `RateLimitedError`. Honor a supplied retry delay and apply backoff.

The reviewed SDK does not expose trigger-order submission. The r9 direct-pool preset is unavailable. See [order types](12-order-types.md) and [direct submission](21-direct-fallback.md).

## SDK reference

Reviewed at `5318a579`. [src/trading.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/trading.ts) · [src/context.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/context.ts) · [src/relayerClient.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/relayerClient.ts) · [src/intents.ts](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/src/intents.ts).
