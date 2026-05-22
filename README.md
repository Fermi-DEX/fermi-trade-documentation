# Fermi-v1 Documentation

Fermi-v1 (`frmv1`) is a non-custodial, fully on-chain perpetual-futures
exchange built on Solana. A single on-chain program owns the order
book, the cross-margin risk engine, funding, and liquidation; a
per-market commit/reveal execution queue sequences every order
first-come-first-served; and an off-chain relayer plus optimistic
"Continuum" harness give traders millisecond-level feedback while on-chain
finality follows behind.

This site is the user-facing reference for **traders, market makers,
liquidators, integrators, and prospective partners or investors**
evaluating the system. It explains both *how Fermi-v1 works* and
*why the design is viable* — start with
[02 - Architecture](02-architecture.md) for the system-level case.


### Getting started
- **[01 - Overview](01-overview.md)** — What Fermi-v1 is, what makes
  it different, and the moving pieces.
- **[02 - Architecture](02-architecture.md)** — The on-chain program,
  relayer, executor, and optimistic harness; how they interact; why
  the design is fair (FCFS) and fast (low optimistic latency); the
  trust model and viability case.
- **[03 - Getting Started](03-getting-started.md)** — Connect a wallet,
  fund an account, place your first order.
- **[04 - Glossary](04-glossary.md)** — Every term used in these docs.

### Accounts & collateral
- **[05 - Accounts](05-accounts.md)** — Fermi account, sub-accounts,
  delegation, account size.
- **[06 - Collateral & Banks](06-collateral.md)** — Supported tokens,
  deposit/borrow indexes, weight scaling.

### Markets
- **[07 - Perp Market Specs](07-market-specs.md)** — Lot sizes, tick
  sizes, leverage tiers, market parameters by symbol.
- **[08 - Pricing & Mark Price](08-pricing-mark-price.md)** — Oracle
  feeds, stable price, mark price.
- **[09 - Funding](09-funding.md)** — Funding rate algorithm, impact
  price, settlement cadence.

### Order book and matching
- **[10 - FIFO Order Book](10-fifo-orderbook.md)** — Price-time priority
  encoding, fixed and oracle-pegged trees.
- **[11 - Matching Engine](11-matching-engine.md)** — Match loop, fill
  events, eviction, post-only behavior.
- **[12 - Order Types](12-order-types.md)** — Limit, IOC, Market,
  PostOnly, PostOnlySlide, OraclePegged, with TIF and reduce-only.
- **[13 - Self-Trade Prevention](13-self-trade-prevention.md)** —
  DecrementTake, CancelProvide, AbortTransaction.
- **[14 - Fees](14-fees.md)** — Maker/taker, IOC penalty, settle
  incentive, liquidation fees, platform fees.

### Risk and PnL
- **[15 - Margin Math & Account Health](15-margin-and-health.md)** —
  Init / Maint / Liquidation-end health, weighted positions.
- **[16 - Entry Price and PnL](16-entry-pnl.md)** — Average entry,
  unrealized vs settled, hupnl, realized trade P&L.
- **[17 - Risk Tiers and Liquidation](17-liquidation.md)** — Triggers,
  phases, fees, force-cancel and force-close.
- **[18 - Bankruptcy & Insurance Fund](18-bankruptcy-insurance.md)** —
  Insurance flow, socialized loss, unsocialized loss.
- **[19 - Risk Warning](19-risk-warning.md)** — What can go wrong, what
  cannot, and what's still your responsibility.

### Execution queue
- **[20 - Execution Queue v5](20-execution-queue.md)** — Per-market
  FIFO, commit/reveal, sequencing, gap recovery, autodrop.
- **[21 - Direct Fallback Pool](21-direct-fallback.md)** — Censorship-
  resistant submission path.

### Integrating
- **[22 - Trader Workflow](22-trader-workflow.md)** — End-to-end flow
  for a bot or UI.
- **[23 - SDK](23-sdk.md)** — TypeScript and Rust clients.
- **[24 - Direct CPI Integration](24-direct-cpi.md)** — Submit orders
  from another Solana program.
- **[25 - HTTP & SSE API](25-api-http.md)** — Continuum harness REST,
  fanout SSE.
- **[26 - gRPC API (Relayer)](26-api-grpc.md)** — `SubmitIntent`,
  signing, error codes.
- **[27 - WebSocket / Streams](27-streams.md)** — Subscriptions for
  fills, book deltas, funding.
- **[28 - FAQ](28-faq.md)** — Common questions about execution,
  margin, and recovery.
- **[29 - Support](29-support.md)** — Where to get help.

## Conventions used in these docs

- Every formula is taken from the on-chain code; the source file and
  line range is cited in italics under the formula.
- All amounts on chain are in **native** (smallest token unit, e.g.
  USDC = 6 decimals → 1 USDC = `1_000_000` native). Where docs show
  human numbers we use **HU**.
- Prices on the book are in **price lots**: integer ratio of
  `quote_lot_size` to `base_lot_size`. To convert:
  `native_price = price_lots × quote_lot_size / base_lot_size`.
- `I80F48` is a fixed-point type — 80 integer bits, 48 fractional bits
  — used everywhere weights, fees, and funding are stored.
- Solana primitives: a *slot* is the validator round (~400ms). A
  *signature* is the on-chain tx hash you can look up on a block
  explorer.

## Network deployment

| Field | Value |
|---|---|
| Cluster | Solana mainnet-beta |
| Program ID | `FRMiKrj2hQGvcZQtSDdiFRZ4cmaTjuc1QVkM2B5ShUvA` |
| Group | `87qUKYQoK1f9gYQjYzw5NcRo7wx6VmfhTGJ7JenoeYAA` |
| SOL-PERP queue | `H298eJU5b4uyAHpeeZQdXS9JUttmmaMh2U6RYkUHFfE9` |
| ETH-PERP queue | `764RYGQACUpWqx3dtYUmfG2G3MK6wXT5WPPRHJxzCJQP` |
| BTC-PERP queue | `ArvDdpYTojBbH4FkCxLxALmX3Sb5qr4VsmFFkgV2NSC3` |

Devnet endpoints are listed in [03 - Getting Started](03-getting-started.md).
# fermi-trade-documentation
