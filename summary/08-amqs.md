---
title: AMQs
description: Placeholder — pending definition
---

# AMQs

> **Placeholder — needs input.**

"AMQs" was requested as one of Fermi's opinionated design pillars,
alongside [FCFS ordering](06-fcfs-ordering.md) and
[fast pre-confirmations](07-fast-pre-confirmations.md). However, the
term does not appear in the supplied technical reference, so this page
has been left as a stub rather than written from a guess — defining an
exchange mechanism incorrectly would be worse than leaving it blank.

To complete this page, please confirm what AMQs refers to and point to
a source. A few possibilities to disambiguate:

- An automated / aggregated market-maker **quoting** primitive (the
  analogue of Phoenix's "spline liquidity") — i.e. a low-cost way for
  market makers to move a whole quote ladder at once.
- An **"async market quote"** submission path.
- Something specific to the POSq layer.

Note: the closest mechanism currently documented is the
**oracle-pegged order**, which lets a market maker post liquidity that
automatically re-prices relative to the oracle without cancel/replace
churn. See [Order Types](17-order-types.md). If "AMQs" is meant to
describe or extend that, say so and this page can be written
accordingly.
