# 04 · Accounts

A **Fermi account** is the per-trader PDA that holds your spot
collateral, perp positions, perp open orders, and serum/openbook
open-orders references for this group. Everything you do on Fermi
flows through one (or more) Fermi account.

## Account model

```
FermiAccount
├── group              (Pubkey)   the Fermi group this account is bound to
├── owner              (Pubkey)   the wallet that owns the account
├── delegate           (Pubkey)   optional second signer (default: 11111…)
├── account_num        (u32)      sub-account index for this owner (0..N)
├── name               ([u8; 32]) human label
├── being_liquidated   (u8)
├── in_health_region   (u8)       set during health-region instructions
├── tokens             (Vec)      up to 8 token positions by default
├── perps              (Vec)      up to 8 perp positions by default
├── perp_open_orders   (Vec)      up to 6 perp open orders by default
└── serum3             (Vec)      up to 8 serum/openbook OO references
```

Sizes are extensible via `account_expand`. The defaults above are the
sizes assigned by `createFermiAccount` with `accountSize = 8`; older
accounts may have smaller arrays and need an expand call before they
can use new slots.

*Source: `programs/fermi-v1/src/state/fermi_account.rs:182,227`.*

### Account is a PDA

A Fermi account is a Program Derived Address — it is deterministically
derived from the group, your wallet (`owner`), and a `account_num`
sub-account index. That means:

- One owner can have many accounts on the same group (different
  `account_num` values), each isolated for risk.
- The account address is deterministic; you don't have to remember it
  if you remember `(group, owner, account_num)`.

## Sub-accounts

Use `account_num = 0, 1, 2, …` to create independent risk pools under
the same wallet. Each sub-account has its own health and liquidates
independently. Common patterns:

- **Strategy isolation.** A directional account (`account_num = 0`)
  separate from a market-making account (`account_num = 1`).
- **Risk caps.** Cap the maximum loss of an experimental strategy by
  funding it in its own sub-account.
- **Bot vs. manual.** A delegated bot-controlled account separate
  from your manual trading account.

## Cross-margin only

Within a single Fermi account, **all positions cross-collateralize**.
There is no isolated-margin mode; if you want isolation, use a
separate sub-account.

## Delegation

Set `delegate` to a hot-wallet pubkey to let a bot sign orders
without ever touching the cold-wallet authority key. The delegate can:

- Place orders, cancel orders, settle PnL, settle funding.
- Edit `name` and trigger non-destructive actions.

The delegate **cannot**:

- Withdraw, deposit (from a non-delegate token account), close the
  account, change the delegate, or change the owner.

Set or rotate via `account_edit`. Setting `delegate = 11111…`
disables delegation.

## Token positions

Each token slot stores:

| Field | Meaning |
|---|---|
| `token_index` | Which Bank this slot is bound to |
| `indexed_position` | Account-side balance × 10^bank_decimals |
| `in_use_count` | Reserved if non-zero (e.g. open serum order) |
| `previous_index` | Index at the time of the last interaction |
| `cumulative_deposit_interest` | Lifetime accrual, for stats |
| `cumulative_borrow_interest` | Lifetime accrual, for stats |

Native deposit / borrow amount is `indexed_position × bank.deposit_index`
(if positive) or `indexed_position × bank.borrow_index` (if negative).
A negative position is a borrow — you pay borrow rate; positive is
a deposit — you earn deposit rate.

A token slot is **active** (counted toward array size) until you call
`token_deactivate` and the indexed position is zero.

## Perp positions

Each perp slot stores (see `fermi_account_components.rs`):

| Field | Meaning |
|---|---|
| `market_index` | Which `PerpMarket` this slot is bound to |
| `base_position_lots` | + long, − short, 0 flat |
| `quote_position_native` | running quote balance, oracle units |
| `quote_running_native` | average-entry tracking |
| `bids_base_lots` / `asks_base_lots` | reserved for resting maker orders |
| `taker_base_lots` / `taker_quote_lots` | reserved for events on the queue |
| `taker_volume` | cumulative taker quote volume |
| `maker_volume` | cumulative maker quote volume |
| `perp_spot_transfers` | settled PnL transfers to/from settle token |
| `long_settled_funding`, `short_settled_funding` | per-position funding marks |
| `settle_pnl_limit_window`, `settle_pnl_limit_settled_in_current_window_native` | settle-rate-limiting state |
| `realized_trade_pnl_native`, `realized_other_pnl_native` | realized P&L buckets |

A perp slot is **active** while base position, unsettled PnL, or any
reserved lots are non-zero. Use `perp_deactivate_position` to free
the slot once it's fully closed and settled.

## Perp open orders

Each `PerpOpenOrder` slot stores:

| Field | Meaning |
|---|---|
| `side` | Bid / Ask |
| `id` | the on-chain order ID (composite key) |
| `client_id` | your `client_order_id` |
| `quantity` | remaining base lots |
| `is_free` | slot status |

Default size is **6 slots** per account. You can have many orders
across markets, but only 6 *resting* perp orders at a time without
expanding the account.

## Account size and expansion

`account_expand` lets you grow the arrays. There's a CPI cost — rent
and a slightly larger account — but no execution cost on subsequent
reads. Call it once when you need more slots; you cannot shrink.

```ts
await client.expandFermiAccount(group, fermiAccount, {
  tokenCount: 16,
  serum3Count: 8,
  perpCount: 16,
  perpOoCount: 16,
});
```

## Health region

Several instructions (notably `flash_loan` and the v5 reveal/execute
path) wrap multiple operations in a "health region" where the account
is allowed to be temporarily insolvent. The on-chain handler sets
`in_health_region = 1`, performs the body, and then restores the
invariant `init_health ≥ 0` (or rolls back).

**Implication for traders:** while your tx is mid-execution, your
on-chain health can dip below zero. Liquidators cannot trigger off
this transient state — only the post-region committed state matters.

## Closing an account

`account_close` deletes a Fermi account and refunds rent. Pre-flight
checks:

- All token positions = 0
- All perp positions = 0 (and `perp_deactivate_position` already called)
- No open orders on book or event queue
- Not currently in liquidation
