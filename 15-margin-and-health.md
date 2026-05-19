# 14 · Margin Math & Account Health

Account "health" on Fermi is a single signed-USD number. Positive =
solvent, zero = at the edge, negative = liquidatable (for the
maintenance flavor). Three flavors are computed:

| Flavor | Used for | Prices used |
|---|---|---|
| `init_health` | Gate on **opening** new exposure (`token_withdraw`, `perp_place_order`, etc.) | Init weights, **stable-band** prices |
| `maint_health` | **Liquidation trigger** (anyone may liquidate when `< 0`) | Maint weights, **oracle** prices |
| `liq_end_health` | Recovery target during liquidation (must be `≥ 0` to exit) | Init weights, oracle prices |

Always: `init_health ≤ liq_end_health ≤ maint_health`.

## What goes into health

A health computation walks every active position on the account and
sums weighted contributions:

```
health = Σ token_contribution
       + Σ perp_health_contribution
       + Σ serum3_open_orders_contribution
```

### Token positions

For each token slot (`health/cache.rs:228-235`):

```
balance_native = indexed_position × index           // signed
price          = price_for(health_type)             // see below

if balance_native > 0:                              // deposit
    weight = asset_weight(health_type)
else:                                               // borrow
    weight = liab_weight(health_type)

contribution = balance_native × price × weight
```

The price selection differs by flavor:

```
maint, liq_end:
    price = oracle_price

init:
    asset side: price = min(oracle_price, stable_price)
    liab  side: price = max(oracle_price, stable_price)
```

The init-side band is what makes `init_health` strictly tighter
than `maint_health`.

### Perp positions

The naive perp PnL is

```
unsettled_pnl = quote_position_native + base_position_native × oracle_price
```

But this is not what flows into health. Health uses **health
unsettled PnL (hupnl)**, computed in
`health/cache.rs:549-618`:

- The base position is multiplied by `base_lot_size × base_price ×
  base_weight`. `base_weight` is `init_base_asset_weight` if you're
  long, `init_base_liab_weight` if you're short (and the analogous
  maint weights for `maint_health`).
- The quote position contributes 1:1 — no weight.
- Open maker orders are accounted at **worst-case** price: bids at
  the liab price (you'd buy at the unfavorable end), asks at the
  asset price.
- The whole positive-PnL contribution is then **capped** by
  `init_overall_asset_weight` (or `maint_overall_asset_weight`).
  This is the "perp-isolation" knob: setting it to `0` means
  positive perp PnL on this market doesn't help you against other
  markets — you must settle to USDC first.

### Open orders on Serum/OpenBook

For each `serum3` slot, the contribution is the **worst-case** of
the bids and asks reservation: the matcher reserves base for sells
and quote for buys, and health treats that reservation as the
worst-of-all-fills assumption.

## Concrete walk-through

Suppose your account holds:

- `1 000 USDC` deposit (Bank: oracle = `$1`, weights init asset =
  `1.0`, liab = `1.0`)
- `2 SOL` deposit (Bank: oracle = `$150`, init asset = `0.85`)
- A long `+5` SOL-PERP base lots (each lot 1 SOL); oracle `$150`,
  init base asset weight = `0.95`, quote_position_native =
  `-$700` (because you bought at $140 → 5 SOL ×140 = 700)
- No borrows, no open orders.

**Init health (USD):**

```
USDC  = 1 000 × 1 × 1.00 = 1 000
SOL   = 2 × 150 × 0.85   =   255       // assume oracle == stable

Perp:
  base contribution    = +5 × 1 × 150 × 0.95 = +712.5
  quote contribution   = -700                = -700
  hupnl                =                       +12.5
  capped at init_overall_asset_weight (e.g. 0.6) → +7.5

init_health = 1 000 + 255 + 7.5 = 1 262.5
```

**Maint health:**

Same shape, but with `maint_base_asset_weight ≈ 1.0` and no overall
cap:

```
Perp:
  +5 × 150 × 1.0 = +750
  -700
  hupnl = +50    (unscaled)

maint_health = 1 000 + 300 + 50 = 1 350
```

This is a very over-collateralized account. To make it
liquidatable, you'd need to either suffer a price drop (oracle goes
down → token contribution drops, perp base contribution drops) or
take on more borrow.

## Withdrawals

`token_withdraw` is gated on **post-withdraw `init_health ≥ 0`**.
Practically: the most you can withdraw is whatever brings init
health to exactly zero, not lower.

The same gate applies to `perp_place_order` (any order that would
push your account into negative init health is rejected
synchronously by the relayer's pre-check, and again on chain at
reveal time).

## Leverage tiers

Fermi does **not** use a separate "leverage tier" table à la
Binance. Effective leverage is just `1 / (1 - init_asset_weight)`
applied to your collateral, capped by liquidation buffer. For a
USDC depositor with `init_asset_weight = 1.0` and a perp with
`init_base_asset_weight = 0.95`:

```
max_long_notional ≈ deposit / (1 - 0.95) = 20× deposit
```

(Simplifying — the exact number depends on the per-market
parameters; the live values are exposed by the SDK and the trading
UI.)

## Health regions

Some instructions wrap multiple operations in a "health region"
where the account is allowed to be transiently insolvent
(`account.in_health_region = 1`). Examples:

- `flash_loan` — borrow, do something, repay; only the
  post-region health matters.
- The v5 reveal/execute path — multiple sub-instructions inside one
  tx may temporarily violate invariants.

A liquidator cannot trigger off the transient state — only the
committed post-region snapshot.

## Reading health programmatically

```ts
const health = await client.computeAccountHealth(group, fermiAccount, 'init');
console.log('init_health (USD)', health.toString());
```

```rust
let cache = new_health_cache(account.borrow(), &account_retriever, now_slot)?;
let init  = cache.health(HealthType::Init);
let maint = cache.health(HealthType::Maint);
```

The cache also exposes `health_ratio` (a unitless health/(deposits)
number) and the per-position contributions, useful for showing
"weakest position" warnings in a UI.
