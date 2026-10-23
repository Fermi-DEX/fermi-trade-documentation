# Diagnosing a problem

Start with the identity of the action and the last stage supported by evidence. “The order disappeared” can mean admission failed, a commit never landed, execution failed, a cancel won, or an optimistic preview was corrected.

## Collect a useful report

Include the cluster, program and group; market index; public FermiAccount; client order ID; intent hash; market sequence; commit/reveal transaction signatures; approximate time and timezone; client/service versions; and the exact error or observed state. For FLP, add the vault PDA, depositor, ticket epoch and relevant epoch-record state.

Do not include seed phrases, private keys, RPC credentials or authorization headers. Signed unexpired intents can still authorize actions; share them only through an appropriate private diagnostic channel.

## Trace by stage

| Observation | Next evidence to inspect |
| --- | --- |
| No acceptance | Client transport and relayer rejection reason |
| Accepted but no commitment | Commit signature, queue ring/head and relayer durable record |
| Commitment present, no progress | Head timing, missing reveal, pauses, retries, oracle/account validity |
| Reveal transaction succeeded | `QueueItemProcessed`, fill events, book and account state |
| UI differs from chain | Response view/slot, stream freshness, reconciliation diagnostics |
| FLP withdrawal waiting | Deferred head, funding window, funding-skip reason and current liquidity |
| FLP claim fails | Ticket/record version, funded status, beneficiary ATA and supplied accounts |

Compare service health with economic progress. A responding `/healthz` does not prove that accepted requests are executing or that vault closes are on time.

For operators, [the operations guide](39-operations.md) identifies the durable state and recovery checks that matter. Never resolve an unknown outcome by blindly replacing a signed transaction or deleting its journal.
