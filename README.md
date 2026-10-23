# Fermi documentation

Fermi is a Solana perpetual-futures exchange with on-chain order books, matching, margin checks, funding, liquidation, and settlement. Off-chain services admit and order signed requests, submit transactions, and give traders a fast provisional view. The program determines the economic result.

Start with [the architecture](02-architecture.md). It follows one order through admission, the Asynchronous Market Queue (AMQ), the optimistic harness, and on-chain execution. Then read [FCFS and POSq](30-posq-sequencing.md) for the exact ordering boundary.

## Choose a path

| You want to… | Read |
| --- | --- |
| Understand the system | [Overview](01-overview.md), [architecture](02-architecture.md), [glossary](04-glossary.md) |
| Trade | [Getting started](03-getting-started.md), [orders](12-order-types.md), [fees](14-fees.md), [margin](15-margin-and-health.md) |
| Understand execution | [Order book](10-fifo-orderbook.md), [matching](11-matching-engine.md), [AMQ](20-execution-queue.md), [POSq](30-posq-sequencing.md), [harness](36-harness-and-latency.md) |
| Understand the money | [Collateral](06-collateral.md), [funding](09-funding.md), [PnL](16-entry-pnl.md), [liquidation](17-liquidation.md), [bankruptcy](18-bankruptcy-insurance.md) |
| Use FLP | [Vault overview](31-flp-vault.md), [shares and NAV](32-flp-accounting.md), [deposits and withdrawals](33-flp-lifecycle.md), [recovery](34-flp-recovery.md) |
| Integrate | [Trader workflow](22-trader-workflow.md), [SDK](23-sdk.md), [HTTP](25-api-http.md), [gRPC](26-api-grpc.md), [FLP integration](35-flp-integration.md) |
| Assess security | [Security boundaries](37-security-and-invariants.md), [risks](19-risk-warning.md), [review scope and corrections](38-source-and-review.md) |
| Diagnose a problem | [FAQ](28-faq.md), [support](29-support.md), [operations](39-operations.md) |

## What this version describes

This documentation was reviewed on 23 October 2026 against `fermi-v1/main` commit `90267b20df99d0eacf35dbd407c67c33d809172b`. It describes source behavior, including the latest FLP recovery changes. A source commit does not establish which binary or configuration is deployed on a network. Verify the program, group, instruction gates, and vault version before using an integration.

The POSq chapter distinguishes the sequencing design in the earlier documentation from the commit/reveal implementation present in this source tree. Latency examples describe stages, not service guarantees.

## Reading conventions

- **On-chain** means validated and recorded by a Solana program. **Optimistic** means provisional local state that can be corrected.
- Amounts in code are native integer units. For a six-decimal token, `1_000_000` units equal one token. Examples explicitly use human units when appropriate.
- A queue sequence belongs to one market. An order ID, client order ID, event sequence, and transaction signature identify different things.
- Parameters such as fees, weights, oracle limits, pauses, and recovery grace periods are configuration. Read the relevant accounts; sample numbers are not a current market schedule.
- Source references are pinned to the reviewed commit. [The review map](38-source-and-review.md) records important changes from the previous docs.
