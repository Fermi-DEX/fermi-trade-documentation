---
title: Glossary
description: Key Fermi Trade terms
---

# Glossary

**Fermi account** — The on-chain address that holds your collateral,
perp positions, and open orders. Only your signature (or a delegate
you authorize) can change it.

**Group** — The collection of markets and collateral banks that share
one cross-margin risk system. Your account belongs to one group.

**Bank** — The on-chain pool for a single collateral token. It holds
the deposits, sets the interest rates, and defines how much that
token counts toward your health.

**Collateral weight** — A discount applied to a deposit (or premium
on a borrow) when computing health. High-quality collateral is
weighted near full value; more volatile assets are weighted lower.

**Perp / perpetual future** — A leveraged contract that tracks an
underlying asset and never expires. You hold synthetic exposure
rather than the asset itself.

**Mark / oracle price** — The spot reference price used to value your
position and compute unrealized PnL and maintenance health.

**Stable price** — A slow, spike-resistant filter on the oracle, used
to widen the safety band when opening new exposure.

**Funding** — Periodic value transfer between longs and shorts that
keeps the perp price anchored to the underlying market.

**Health** — A single signed-USD number summarizing your account's
solvency. Positive is safe; negative maintenance health means you can
be liquidated.

**Init / maintenance / liquidation-end health** — Three flavors of
health: init gates opening new exposure (strictest), maintenance is
the liquidation trigger, and liquidation-end is the recovery target.

**FCFS** — First-come-first-served. The ordering policy Fermi uses:
earlier orders execute first, and nobody can jump the line.

**POSq sequencing layer** — Fermi's verifiable sequencing layer. In v1,
it runs in single-sequencer mode, ordering encrypted transactions over
VDF ticks so reordering is detectable. V2 is planned to add voting,
leader rotation, and permissionless participation. See
[POSq Sequencing Layer](05-posq-sequencing-layer.md).

**Commit / reveal** — The two-step protocol that locks an order's
sequence and a hash of its contents on chain *before* the contents
are revealed and executed. Together with POSq's encrypted VDF-tick
sequence, this is what makes ordering auditable.

**Pre-confirmation** — The optimistic, sub-second prediction of your
fill, shown before the transaction reaches on-chain finality.

**Maker / taker** — A maker posts a resting order that adds liquidity;
a taker crosses the spread and removes it. Fees differ by role.

**Reduce-only** — An order flag that can only shrink your position
toward zero, never increase or flip it.

**Liquidation** — The permissionless process that reduces an
underwater account's exposure to restore solvency.

**Insurance fund** — A reserve that absorbs shortfalls when a
liquidated account's losses exceed its collateral.

**Socialized loss** — The last-resort mechanism that spreads an
uncovered shortfall proportionally across depositors of the affected
token.

**Slot / signature** — Solana primitives. A slot is one validator
round (~400 ms); a signature is the on-chain transaction hash you can
look up on a block explorer.
