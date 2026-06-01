# Fermi Trade — Documentation (draft)

Human-readable documentation for **Fermi Trade**, a non-custodial,
on-chain perpetual-futures exchange on Solana.

These pages are written at the same level of abstraction as the
Phoenix docs — conceptual, reader-first, and light on on-chain
internals — while covering the same breadth as the Fermi technical
reference. They are intended to drop into a Mintlify-style docs site.

## Page index

**Start here**
1. `01-welcome.md` — What Fermi Trade is
2. `02-getting-started.md` — Connect, fund, place your first order
3. `03-glossary.md` — Key terms

**Design**
4. `04-architecture.md` — How Fermi is built and why it is both fair and fast
5. `05-posq-sequencing-layer.md` — The POSq sequencing layer *(placeholder — coming soon)*
6. `06-fcfs-ordering.md` — First-come-first-served ordering
7. `07-fast-pre-confirmations.md` — Millisecond pre-confirmations
8. `08-amqs.md` — *(placeholder — see note below)*

**Accounts & collateral**
9. `09-accounts.md`
10. `10-collateral.md`

**Markets**
11. `11-perpetual-futures.md`
12. `12-market-specs.md`
13. `13-pricing-and-mark-price.md`
14. `14-funding.md`

**Order book & matching**
15. `15-order-book.md`
16. `16-matching-engine.md`
17. `17-order-types.md`
18. `18-self-trade-prevention.md`
19. `19-fees.md`

**Risk & PnL**
20. `20-margin-and-health.md`
21. `21-entry-price-and-pnl.md`
22. `22-liquidations.md`
23. `23-bankruptcy-and-insurance.md`
24. `24-risk-warning.md`

**Resilience & integration**
25. `25-direct-onchain-submission.md`
26. `26-trader-workflow.md`
27. `27-api-and-sdk.md`
28. `28-faq.md`
29. `29-support.md`

## Two notes for the editor (not for publication)

- **POSq sequencing layer.** Per direction, ordering and
  censorship-resistance claims throughout these pages are attributed
  to the **POSq sequencing layer**, not to a single trusted relayer.
  The dedicated page (`05`) is intentionally left blank ("coming
  soon"). The underlying relayer/executor mechanics are still
  described where useful, but framed as plumbing beneath POSq rather
  than as a party you must trust for fairness.
- **AMQs.** "AMQs" was requested as one of the opinionated design
  pillars, but the term does not appear in the supplied technical
  documentation, so `08-amqs.md` is a flagged placeholder. Please
  confirm what AMQs refers to (e.g. an automated market-maker quoting
  primitive, an "async market quote" path, etc.) and point me to a
  source so it can be written accurately rather than guessed at.
