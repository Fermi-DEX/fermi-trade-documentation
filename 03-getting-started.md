# 02 · Getting Started

This page walks you from a fresh wallet to your first filled perp.

## 1. Prerequisites

| You need | Why |
|---|---|
| A Solana wallet (Phantom, Backpack, Solflare, or a CLI keypair) | To sign account creation and order intents. |
| Some SOL on mainnet-beta (≥ 0.05 SOL) | Solana account rent + transaction fees. |
| At least one supported collateral token (USDC recommended) | To deposit as margin. See [06 - Collateral](06-collateral.md). |
| The Fermi SDK, or any client that speaks the relayer's gRPC | To submit orders. See [23 - SDK](23-sdk.md). |

## 2. Network endpoints

### Mainnet-beta

| Service | Endpoint |
|---|---|
| Solana RPC | Use any reliable mainnet RPC (Helius, Triton, QuickNode, etc.) |
| Program ID | `FRMiKrj2hQGvcZQtSDdiFRZ4cmaTjuc1QVkM2B5ShUvA` |
| Group | `87qUKYQoK1f9gYQjYzw5NcRo7wx6VmfhTGJ7JenoeYAA` |
| Relayer (gRPC) | published in `ts/client/src/ids.json` and the SDK |
| Optimistic harness (HTTP/SSE) | published in `ts/client/src/ids.json` and the SDK |

### Devnet

A devnet deployment is maintained for integration testing. Endpoints
and program ID rotate with releases — always pull them from
`ts/client/src/ids.json` rather than hardcoding.

## 3. Create a Fermi account

A *Fermi account* is the per-trader PDA that holds your spot
collateral, perp positions, and open orders. You create one once and
then reuse it across every market in the group.

```ts
import { FermiClient, FERMI_V1_ID } from '@fermi/client';

const client = await FermiClient.connect(connection, FERMI_V1_ID);
const group = await client.getGroup(GROUP_PUBKEY);

const accountNum = 0;            // first sub-account
const accountSize = 8;           // 8 token slots, 8 perp slots, 6 perp OO
const tx = await client.createFermiAccount(group, owner, accountNum, accountSize);
```

A Fermi account can hold up to `8` token positions, `8` perp positions,
and `6` perp open orders by default; expand it with
`account_expand` if you need more. Each account is owned by a single
authority but can have a `delegate` keypair that can sign orders on
its behalf (handy for hot-wallet bots).

## 4. Deposit collateral

Deposits credit your Fermi account with **indexed deposits** in the
matching `Bank`. Your effective collateral is then
`indexed_deposits × deposit_index × price × asset_weight` — see
[15 - Margin & Health](15-margin-and-health.md).

```ts
const usdcBank = group.getFirstBankByMint(USDC_MINT);
await client.tokenDeposit(group, fermiAccount, usdcBank, /* amount HU */ 1000);
```

The deposit settles instantly. There is no withdrawal lockup beyond
the post-deposit init-health check; you can withdraw any amount that
keeps `init_health ≥ 0`.

## 5. Place your first perp order

```ts
const perp = group.getPerpMarketByName('SOL-PERP');

const order = {
  side: 'bid',
  priceLots: perp.uiPriceToLots(150.5),
  maxBaseLots: perp.uiBaseToLots(2),
  clientOrderId: 1n,
  reduceOnly: false,
  timeInForceSeconds: 0,                    // 0 = good-till-cancel
  selfTradeBehavior: 'decrement_take',
  params: { type: 'fixed', orderType: 'limit' },
};

const intent = await client.buildPerpPlaceOrderIntent(fermiAccount, perp, order);
const sig = await intent.signWith(owner);
const submission = await relayer.submitIntent(sig);
console.log('seq', submission.sequence, 'tx', submission.txSignature);
```

The relayer returns the assigned sequence immediately. Two ways to
follow your order:

- **Streaming (recommended for UIs / bots):** subscribe to the SSE
  stream from the fanout service and watch for a `FillLogV3` whose
  `taker_client_order_id == 1`.
- **Trace endpoint:** `GET /trace/sequence/{market}/{seq}` on the
  optimistic harness reports every stage your intent has hit
  (accepted → committed → submitted → revealed → executed).

## 6. Settle PnL

Perp PnL on Fermi is **delayed** until you (or someone else) calls
`perp_settle_pnl` against a counterparty with the opposite sign.
Until then, it lives as `quote_position_native` on your perp position
and contributes to health via "health unsettled pnl" (hupnl).

```ts
await client.perpSettlePnl(group, accountWithProfit, accountWithLoss, perpMarket);
```

See [16 - Entry Price and PnL](16-entry-pnl.md) and
[20 - Execution Queue](20-execution-queue.md) for full mechanics.

## 7. Cancel and close

```ts
await client.perpCancelOrder(group, fermiAccount, perp, orderId);
await client.perpCancelAllOrders(group, fermiAccount, perp);
await client.perpDeactivatePosition(group, fermiAccount, perp);  // when zero & settled
```

Cancels free up `bids_base_lots` / `asks_base_lots` immediately on the
account but the order stays in the book until the next `consume_events`
or matching fill. Cancellation does not generate a fill.

## 8. Local development

To run the full stack against a localnet validator, see
`fermi-v1/usage_guide.md` and `fermi-v1/setup.md`. The short version:

```bash
./startup_local.sh           # spins up validator, deploys program, seeds group
yarn workspace @fermi/client run e2e:local
```
