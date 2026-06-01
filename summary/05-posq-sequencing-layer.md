---
title: POSq Sequencing Layer
description: The layer responsible for fair ordering and censorship resistance
---

# POSq Sequencing Layer

> **Coming soon.** This page is a placeholder.

The **POSq sequencing layer** is the part of Fermi responsible for
**fair, first-come-first-served ordering** and **censorship
resistance**. It assigns every order its place in line, and the order
it assigns is locked on chain before anyone can see the order's
contents — which is what makes Fermi's fairness verifiable rather than
merely promised.

A full description of POSq — its design, its participants, its trust
and liveness properties, and how it interacts with the on-chain
execution queue — will be published here.

In the meantime:

- For how a locked sequence is enforced and verified on chain, see
  [FCFS Ordering](06-fcfs-ordering.md).
- For the permissionless on-chain path that backstops inclusion, see
  [Direct On-Chain Submission](25-direct-onchain-submission.md).
