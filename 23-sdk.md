# 22 · SDK

Fermi ships first-class clients in **TypeScript** and **Rust**, plus
a thin **Python** client. All three speak to the same on-chain
program and the same relayer / harness services.

## TypeScript (`@fermi/client`)

The TypeScript client lives in `ts/client/`. Mainnet constants ship
in `ts/client/src/ids.json` — always read them from there rather
than hardcoding addresses.

### Install

```bash
yarn add @fermi/client
# or
npm install @fermi/client
```

Pin to the version recommended by the live deployment notes; the
package tracks the on-chain program releases.

### Quick start

```ts
import {
  FermiClient,
  FERMI_V1_ID,
  GROUP_PUBKEY,
} from '@fermi/client';
import { Connection, Keypair } from '@solana/web3.js';

const connection = new Connection(RPC_URL, 'confirmed');
const owner      = Keypair.fromSecretFile('owner.json');
const client     = await FermiClient.connect(connection, FERMI_V1_ID);
const group      = await client.getGroup(GROUP_PUBKEY);
const acct       = await client.getFermiAccountForOwner(group, owner.publicKey, 0);

const perp       = group.getPerpMarketByName('SOL-PERP');

const intent = await client.buildPerpPlaceOrderIntent(acct, perp, {
  side: 'bid',
  priceLots:    perp.uiPriceToLots(150),
  maxBaseLots:  perp.uiBaseToLots(1),
  clientOrderId: 1n,
  reduceOnly:    false,
  timeInForceSeconds: 0,
  selfTradeBehavior: 'decrement_take',
  params: { type: 'fixed', orderType: 'limit' },
});

const signed = await intent.signWith(owner);
const result = await client.submitIntent(signed);
console.log(result.sequence, result.txSignature);
```

### High-level API surface

| Method | Purpose |
|---|---|
| `connect(connection, programId)` | Build a client. |
| `getGroup(pubkey)` | Load + decode a Group. |
| `getFermiAccountForOwner(group, owner, num)` | Load a Fermi account by `(group, owner, num)`. |
| `createFermiAccount(...)` | Create. |
| `accountExpand(...)` | Grow the account slot arrays. |
| `tokenDeposit(group, acct, bank, amount)` | Deposit. |
| `tokenWithdraw(group, acct, bank, amount, allowBorrow)` | Withdraw, optionally with borrow. |
| `buildPerpPlaceOrderIntent(acct, perp, order)` | Build a signable intent. |
| `submitIntent(signed)` | Send to relayer; returns sequence. |
| `perpCancelOrder*` | Cancel by id / client_id / side / all. |
| `perpSettlePnl(group, a, b, perp)` | Settle PnL. |
| `perpSettleFees(group, perp, account)` | Settle accrued protocol fees. |
| `perpDeactivatePosition(group, acct, perp)` | Free a perp slot. |
| `computeAccountHealth(group, acct, kind)` | `init` / `maint`. |
| `useContinuumHarness(url)` | Point reads at the harness. |

### Continuum harness helpers

```ts
const harness = client.useContinuumHarness(HARNESS_URL);

await harness.getBook('SOL-PERP');
await harness.getUserState(owner.publicKey);
await harness.getTrace('SOL-PERP', sequence);

for await (const ev of harness.subscribeFills('SOL-PERP')) {
  console.log(ev);
}
```

The harness client wraps SSE for streaming and HTTP for one-shots.
It supports both an **optimistic** view (relayer-accepted, not yet
confirmed) and a **confirmed** view (chain-finalized) via a `?view=`
query param.

## Rust (`fermi-client` / `fermi-v1-client`)

The Rust client lives in `lib/` and is what the relayer + executor +
liquidator services use internally.

### Add to Cargo.toml

```toml
[dependencies]
fermi-v1-client = { path = "../../lib/client" }    # or git/version
solana-sdk      = "1.16"
anchor-client   = "0.28"
```

### Example

```rust
use fermi_v1_client::{Client, FermiClientConfig};
use solana_sdk::signer::keypair::read_keypair_file;

let owner   = read_keypair_file("owner.json")?;
let cluster = anchor_client::Cluster::Custom(
    "https://api.mainnet-beta.solana.com".into(),
    "ws://api.mainnet-beta.solana.com/".into(),
);

let cfg     = FermiClientConfig::mainnet(&owner);
let client  = Client::builder()
    .cluster(cluster)
    .keypair(owner)
    .program_id(FERMI_V1_ID)
    .build()?;

let group   = client.group(GROUP_PUBKEY).await?;
let account = client.fermi_account_for_owner(GROUP_PUBKEY, owner.pubkey(), 0).await?;

let perp    = group.perp_market_by_name("SOL-PERP")?;
let intent  = client.build_perp_place_order_intent(&account, &perp, order)?;
let signed  = intent.sign_with(&owner)?;
let result  = client.submit_intent(signed).await?;
```

The Rust client exposes the same operations as TypeScript plus a few
extras the keeper services rely on:

- `liquidator::find_candidates()` — scans for liquidatable accounts.
- `settler::find_pairs()` — finds settlement counterparties.
- `harness::subscribe_*` — typed SSE streams.

## Python (`fermi-client`)

The Python client (`py/`) is currently a skeleton. It depends on
`anchorpy`, `solana`, and `requests`. It will cover read-only state
queries first and order submission after the gRPC bindings land.
For production trading on Python today, use the TypeScript client
through a small Node bridge.

## ids.json

The single source of truth for live constants:

```json
{
  "groups": [{
    "publicKey": "87qUKYQoK1f9gYQjYzw5NcRo7wx6VmfhTGJ7JenoeYAA",
    "programId": "FRMiKrj2hQGvcZQtSDdiFRZ4cmaTjuc1QVkM2B5ShUvA",
    "perpMarkets": [
      { "name": "SOL-PERP", "perpMarketIndex": 0, "publicKey": "...", "queue": "H298eJU5b4uyAHpeeZQdXS9JUttmmaMh2U6RYkUHFfE9" },
      { "name": "ETH-PERP", "perpMarketIndex": 1, "publicKey": "...", "queue": "764RYGQACUpWqx3dtYUmfG2G3MK6wXT5WPPRHJxzCJQP" },
      { "name": "BTC-PERP", "perpMarketIndex": 2, "publicKey": "...", "queue": "ArvDdpYTojBbH4FkCxLxALmX3Sb5qr4VsmFFkgV2NSC3" }
    ],
    "banks": [
      { "name": "USDC", "tokenIndex": 0, "publicKey": "...", "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" }
    ],
    "relayer":  "https://relayer.fermi.exchange/grpc",
    "harness":  "https://harness.fermi.exchange",
    "fanout":   "https://fanout.fermi.exchange"
  }]
}
```

Always pull the live `ids.json` from the latest SDK release.
Hardcoding queue / bank addresses risks silent regressions if a
governance migration moves them.

## gRPC proto

The relayer's `SubmitIntent` API is defined by
`ts/client/scripts/execution-queue/ctm_sequencer.proto`. Both
TypeScript and Rust clients build against the same proto. If you
want to integrate from another language, generate stubs from that
file — do not copy the wire format manually, the canonical message
construction is subtle.

See [26 - gRPC API](26-api-grpc.md) for the full message reference.
