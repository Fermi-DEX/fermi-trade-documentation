# POSq, arrival order and FCFS

POSq is the sequencing design described in Fermi's earlier documentation: order encrypted intents over a VDF tick stream, expose evidence of that order, then commit the resulting market sequence to the AMQ. Its purpose is to make ordering decisions auditable before execution reveals economically useful payloads.

The AMQ provides the on-chain enforcement half of that design. It cannot, by itself, prove which request reached an off-chain service first.

## Evidence boundary for this review

The reviewed `fermi-v1` tree contains:

| Evidence | What it establishes |
| --- | --- |
| `continuum_sequencer.proto` | An interface for accepted transactions and ticks, including VDF proof fields, batch hash and previous output |
| `ctm_sequencer.proto` | A relayer interface accepting signed payloads and account metas |
| Rust relayer implementation | Local admission, sequence allocation, preplay, batching and transaction delivery |
| v5 commit handler | Verification of the configured CTM batch signature and storage of sequence-bound commitments |
| v5 reveal handlers | Head-first hash verification, authorization and on-chain dispatch |

The presence of VDF fields in an interface does not establish a working proof verifier or deployment. This review did not identify a VDF verification or encrypted-admission implementation in the examined relayer and on-chain paths. The earlier documentation's [research-paper link](https://app.fermi.trade/research.pdf) could not be retrieved during the review. Consequently, the encrypted-tick description here is a **design description**, not a verified claim about the deployed fast path.

## Why order before reveal?

If an operator learns the contents of competing orders before fixing their order, it can choose a favorable sequence. The POSq design seeks to constrain that discretion by associating encrypted requests with a verifiable tick/batch history before revealing payloads.

A verifiable delay function supplies evidence of sequential computation under its cryptographic assumptions. It does not alone prove the true arrival time of a network packet, guarantee admission or make data available. A complete fairness argument also needs rules for ingress observation, receipt issuance, tick assignment, batch membership, omissions, reveal availability and the mapping into market sequences.

## The end-to-end argument

For an auditable FCFS claim, the evidence must connect all of these steps:

```text
recognized arrival → accepted receipt → tick / ordered batch
                   → market sequence → on-chain commitment
                   → head resolution → book result
```

The source reviewed here enforces the commitment-to-head-resolution portion. To extend that claim to recognized arrival, a deployment must publish or otherwise make available the upstream ordering evidence and its verification rules.

A hash commitment prevents changing its preimage after commitment. It does not prove payload confidentiality from an operator that received plaintext, and it does not establish fairness of the sequence chosen before commitment. A randomizer helps prevent guessing predictable preimages; it is not encryption.

## Single-sequencer design and future participation

The previous docs describe v1 as single-sequencer POSq and propose voting, leader rotation and permissionless participation for v2. Treat those as design/deployment claims requiring their own implementation evidence. A single service retains admission and availability power unless another enforced mechanism constrains it.

More participants also need explicit rules for equivocation, censorship, data availability and failure recovery. Those properties do not follow merely from adding signatures or a VDF.

## What users can rely on from this source

A valid higher-sequence reveal cannot replace the current queue head. The program checks the exact commitment and authorizes the action against current account state. The book applies its own price-time rules after dispatch. Queue expiry, gaps, terminal failures and admin reclaim are visible exceptions to ordinary execution; enabled direct instructions are a separate path.

This narrower claim is still useful. Fixing admitted order lets the harness preplay a more predictable stream while the exchange executes on chain. It does not remove oracle changes, cross-account interactions or reconciliation risk.

See [the queue](20-execution-queue.md), [architecture](02-architecture.md), and [security boundaries](37-security-and-invariants.md).


## Implementation reference

Protocol reviewed at `90267b20`; standalone SDK references at `5318a579`. [continuum_sequencer.proto](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/ts/client/scripts/execution-queue/continuum_sequencer.proto) · [ctm_sequencer.proto](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/proto/ctm_sequencer.proto) · [main.rs — bin source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/bin) · [execution_queue_v5.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs). Source links require access to the implementation repository.
