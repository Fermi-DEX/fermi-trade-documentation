# Reader API and integration

The hosted mainnet reader reports FLP state. It does not build transactions, sign for users, or hold their keys.

```text
Base URL: https://flp-mainnet.34-116-238-207.sslip.io
Vault:    8aHdjxJzec6CfBngSFZYQvqZsBtXWXG6j1C3rW799pbP
```

## Routes

Replace `:vault` with the vault address. Replace `:owner` with the wallet owner address.

| GET route | Result |
|---|---|
| `/deployment.json` | Deployment addresses and recorded configuration |
| `/healthz` | Reader health |
| `/state/vaults/:vault` | Lifecycle, configuration, epoch, supply, valuation, flows, and queues |
| `/state/vaults/:vault/users/:owner` | Vault state plus the owner's tickets, approval, claims, and availability |
| `/state/vaults/:vault/users/:owner/exit-estimate` | Indicative payout and queue/funding conditions |
| `/state/vaults/:vault/portfolio` | Collateral, positions, open-order references, and indicative health |
| `/state/vaults/:vault/daily` | Sampled daily PnL and assets |
| `/state/vaults/:vault/monitor` | Unsettled-PnL observations and alert-delivery state, when enabled |
| `/state/markets` | A slower market summary, not a live order-book feed |

The exit-estimate route accepts `?shares=N`, with `N` in share-native units.
The daily route accepts `?historic=true` for a separately labeled strategy reference series.
That reference series is not historical performance of the deployed vault.

To read the vault:

```sh
curl --fail --silent --show-error   'https://flp-mainnet.34-116-238-207.sslip.io/state/vaults/8aHdjxJzec6CfBngSFZYQvqZsBtXWXG6j1C3rW799pbP'
```

## Response formats

Vault responses include `schema_version`, `generated_ts_ms`, `source`, `data`, and `cache`.
The `source` object identifies the program, profile, commitment, and observed slot.
The mainnet profile is `rc6`, with version-4 vault accounts.

Large integer values are decimal strings. Do not convert amounts or share supplies to JavaScript `Number`.
USDC and shares each use six decimals. One whole token is `1000000` native units.
A Q48 value uses `raw / 2^48`. Preserve integer precision until display formatting.

A null value with a reason means unavailable information, not zero.
A stale historical program observation is not current NAV.
The portfolio reader's indicative low NAV does not replay unconsumed fills in the same way as the on-chain pricing path.

## Freshness

Read `source.slot`, the commitment, and `cache` before you use a response.
The current reader can serve a cached copy up to 60 seconds old during background refresh.
`cache.stale` identifies such a copy. The reader refuses an older cached copy.

Vault-change notifications invalidate applicable cached vault reads.
This does not turn every related market field into a real-time feed.
The mainnet market summary can refresh over one to five minutes and does not track trades.
Use the trading API or your own RPC for live market data.

## Ticket states

| State | UI meaning |
|---|---|
| `none` | No ticket for that flow |
| `queued` | Request accepted, awaiting its close or funding |
| `claimable-shares` | Accepted deposit shares can be claimed |
| `refund-only` | Deposit principal can be refunded instead of converted |
| `deferred` | Withdrawal batch is not yet funded |
| `funded-claimable` | The withdrawal has a fixed claim backed by redemption escrow |
| `unavailable` | The reader cannot establish the state |

Read `data.lifecycle` and `data.user.availability` before enabling a transaction button.
Availability describes status permissions. It does not guarantee successful execution.
Use `refundablePublicPrincipal` for pre-deposit refunds and `graduationClaimableShares` for converted but unclaimed entry shares.
`investedSharesIncludingOwedAndUnfunded` includes more than the wallet's minted token balance.

## Unsettled-PnL monitoring

The reader reports gross positive oracle-marked unsettled PnL and its ratio to indicative `NAV_mid`.
Losses and external hedges do not offset this gross positive metric.
The deposit page must display the entry/exit disclosure from [share pricing](33-flp-pricing.md#unsettled-pnl).

| Tier | Condition | Operator response |
|---|---|---|
| 1 | Total reaches 200 basis points of NAV for longer than one funding window | Settle now |
| 2 | Total reaches 800 basis points, or one market reaches 500 basis points | Investigate settlement failure |
| 2 | A market remains positive across two observed consecutive epochs | Investigate settlement failure |

These are operational alerts, not automatic withdrawal guarantees or circuit breakers.
Sampled positive-PnL age cannot prove the age of each individual profit claim.
The monitor route reports actual alert-delivery state. A risk field alone does not prove that an alert reached an operator.

## Transactions and SDKs

Transaction integrations use `FlpV4Client` with the matching version-4 IDL and explicit mainnet program IDs.
Request the current SDK integration package through [Fermi support](29-support.md).
The public program repository is a source and build snapshot, not an installable frontend SDK package.

Keep RPC provider credentials on the backend. A public read URL does not require disclosure of your provider key.
Use the wallet to sign user transactions. Verify the transaction result before changing the displayed ticket state.

If a submission result is unknown, reconcile its signature before creating another economic request.
A successful API read or simulation does not establish that a transaction finalized on chain.

Source: [Deployed FLP program](https://github.com/Fermi-DEX/fermi-v1-programs/tree/623f113075bd124948eabac8589bfbe8c53b11e8/flp/programs/flp-vault/src).
