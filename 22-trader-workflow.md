# 21 · Trader Workflow

End-to-end recipe for a programmatic trader on Fermi. The same flow
applies to a UI; both rely on the same SDK and read/write surfaces.

## Required state on the trader side

A working bot keeps:

| State | Source | Refresh cadence |
|---|---|---|
| Group config (banks, perps, oracles) | Optimistic harness `GET /config` | Once at startup; on a config-bump event |
| Account state | Optimistic harness `GET /state/users/:owner` or direct RPC | On every fill / cancel / settlement |
| Orderbook | Optimistic harness `GET /state/book/:market` + SSE deltas | Continuous via SSE |
| Oracle prices | Optimistic harness `GET /state/oracles` or direct RPC | Per-slot or on Pyth update |
| Liquidation candidates (if you're a liqor) | Optimistic harness `/state/users` index | Continuous polling |
| Your unfilled intents | Local state | Locally; reconcile from harness `/trace` periodically |

## The order placement loop

```
loop:
  1. Decide an order — side, price, size, type — using your strategy.
  2. Build a v5 intent off-chain using the SDK.
  3. Sign the canonical message with your authority (or delegate) key.
  4. Submit to the relayer via gRPC SubmitIntent.
  5. Receive (sequence, tx_signature) immediately.
  6. Subscribe / await your client_order_id in the fanout fill stream.
  7. On fill: update your local position, mark client_order_id done.
  8. On no fill within TIF: order auto-expired; you'll see an OutEvent.
  9. On error: see the error code in the trace and handle.
```

## Step-by-step with TypeScript

### 1. Connect

```ts
import { FermiClient, FERMI_V1_ID } from '@fermi/client';
import { Connection, Keypair } from '@solana/web3.js';

const connection = new Connection(RPC_URL, 'confirmed');
const owner      = Keypair.fromSecretFile('owner.json');
const client     = await FermiClient.connect(connection, FERMI_V1_ID);

const group        = await client.getGroup(GROUP_PUBKEY);
const fermiAccount = await client.getFermiAccountForOwner(group, owner.publicKey, 0);
```

### 2. Read state

```ts
await fermiAccount.reload(client);

const perp     = group.getPerpMarketByName('SOL-PERP');
const oracle   = await perp.oraclePrice(connection);
const book     = await client.getOrderbook(perp);          // bids + asks merge
const initHp   = await client.computeAccountHealth(group, fermiAccount, 'init');
```

You can also point the SDK at the optimistic harness instead of
direct RPC reads — it's faster and gives you optimistic state.

```ts
const harness = client.useOptimisticHarness(HARNESS_URL);
const book    = await harness.getBook('SOL-PERP');
const state   = await harness.getUserState(owner.publicKey);
```

### 3. Build and sign an intent

```ts
const order = {
  side: 'bid',
  priceLots: perp.uiPriceToLots(150.5),
  maxBaseLots: perp.uiBaseToLots(2),
  clientOrderId: 1042n,
  reduceOnly: false,
  timeInForceSeconds: 60,
  selfTradeBehavior: 'cancel_provide',
  params: { type: 'fixed', orderType: 'limit' },
};

const intent = await client.buildPerpPlaceOrderIntent(fermiAccount, perp, order);
const signed = await intent.signWith(owner);   // or delegateKeypair
```

The signed intent contains the **canonical user-intent message**,
the user's Ed25519 signature, and the full account list. The
signature binds both payload and accounts; any post-signing
substitution is caught on chain.

### 4. Submit

```ts
const relayer    = await client.connectRelayer(RELAYER_URL);
const submission = await relayer.submitIntent(signed);

console.log('sequence:', submission.sequence,
            'commit tx:', submission.txSignature);
```

The relayer returns:

- `sequence` — your slot in the per-market FIFO.
- `txSignature` — the commit transaction signature (look up on a
  block explorer).
- `acceptedSlot` — the slot the relayer admitted you.
- `expiresAtSlot` — when the intent will be auto-failed if not
  revealed.

### 5. Watch for fills

```ts
const stream = harness.subscribeFills(perp, { fromSeq: 'now' });
for await (const fill of stream) {
  if (fill.taker_client_order_id === 1042n) {
    console.log('Filled', fill.quantity, '@', fill.price, 'fee', fill.taker_fee);
    break;
  }
}
```

Or by `taker` pubkey, or by `maker` pubkey if you're the maker side.

### 6. Handle errors

If the relayer's `SubmitIntent` returns an error, it's one of:

- `INVALID_SIGNATURE` — the signature doesn't match the canonical
  message. Re-sign with the correct authority.
- `STALE_ACCOUNT` — your local view of the account is older than
  the on-chain state. Reload and rebuild.
- `ORACLE_STALE` — the oracle is past its freshness window. Wait
  or push a Pyth update yourself.
- `HEALTH_PRECHECK_FAILED` — the order would put you into
  negative init health. Adjust size / price / collateral.
- `MARKET_REDUCE_ONLY` — the market is reduce-only and your order
  increases exposure.

If the *on-chain* dispatch fails after the relayer accepted, the
`/trace/sequence/{market}/{seq}` endpoint exposes the program error
code. Common ones:

- `MaintenanceHealthBelowZero` — your maint health was already
  negative when the order revealed; the fix is to deposit more
  collateral, then resubmit.
- `WouldSelfTrade` — `AbortTransaction` SLT triggered.
- `ExecutionQueueV5IntentReplay` — you re-submitted a previously
  consumed intent within the replay window.

## Cancellation

```ts
await client.perpCancelOrderByClientOrderId(group, fermiAccount, perp, 1042n);
```

This goes through the relayer like any other intent. It's a
separate intent type with its own commit/reveal, so it has a tiny
latency delay. If you need a *synchronous* cancel for a closing
flow, use the direct path or call `perp_cancel_order` via Anchor
directly (no queue at all):

```ts
const ix = await client.buildPerpCancelOrderAnchorIx(group, fermiAccount, perp, orderId);
await sendAndConfirm(connection, [ix], [owner]);
```

## Settling P&L

```ts
await client.perpSettlePnl(
  group,
  /* +PnL account */ winnerAccount,
  /* -PnL account */ loserAccount,
  perp,
);
```

You can pass `fermiAccount` as either side; settlement is one
operation per `(account_a, account_b, market)` triple. Most bots
settle their own +PnL against the highest -PnL counterparty
returned by the harness's `getSettleCandidates(perp)` helper.

## Withdrawing

```ts
await client.tokenWithdraw(group, fermiAccount, usdcBank, /* HU */ 500, false);
```

The `allowBorrow` last argument is `true` to let the withdrawal
roll into a borrow if you've got open perp positions consuming
your spot collateral.

## A clean shutdown sequence

```
1. perpCancelAllOrders(perp)   // for every perp you've touched
2. perpSettlePnl(...)          // settle to USDC
3. close any base position via a market order
4. perpSettlePnl(...)          // again, to flush leftover unsettled PnL
5. perpDeactivatePosition(perp)
6. tokenWithdraw(usdc, all)
7. accountClose()              // optional, if you want the rent back
```

You don't *have* to close — leaving collateral on Fermi is the
default for a returning trader — but the steps above are the
canonical "go to zero" path.
