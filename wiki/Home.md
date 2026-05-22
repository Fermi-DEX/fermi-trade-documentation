# Fermi-v1 Wiki

Fermi-v1 is a non-custodial perpetual futures exchange on Solana. It
keeps custody, matching, margin, funding, and liquidation on chain, while
off-chain services handle fast submission and fast reads.

This wiki is the human-readable companion to the technical reference
manual in the repository root.

## Pages

- [Project Aims](Project-Aims)
- [Architecture](Architecture)
- [Microstructure Benefits](Microstructure-Benefits)
- [Trust, Risk, and Failure Modes](Trust-Risk-and-Failure-Modes)

## One-sentence model

Fermi-v1 combines a public on-chain settlement program, a per-market
commit/reveal execution queue, a price-time-priority order book, and an
optimistic read layer so traders get verifiable settlement with low
latency feedback.
