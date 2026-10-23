# Source review and version boundary

This documentation describes `Fermi-DEX/fermi-v1` at commit `90267b20df99d0eacf35dbd407c67c33d809172b`, the `main` head retrieved for this review on 23 October 2026. The previous documentation baseline was `326dd8833d9937ff3def6711877905056f527fee` in `fermi-trade-documentation`.

The review followed the queue/authorization path, relayer and harness interfaces, matching and health/accounting code, and FLP pricing, lifecycle and recovery handlers. It compared those mechanisms with the existing public docs and the implementation repository's design notes. Source code takes precedence where those notes describe an older release.

## Client source and r9 boundary

Client usage follows `Fermi-DEX/Fermi-v1-sdk` at `5318a579dbb10ea34c182df9330a631a8aea2197`, package version `0.2.0`. The SDK review covers its exports, account client, context, wire encoders, gateway clients, fee helpers, streams and r9 preset.

Clients inside the protocol repository are deprecated. Protocol-source links describe onchain or service mechanisms, not recommended client imports. The standalone SDK has no FLP transaction builders or trigger-order fields at this revision. Its r9 preset rejects direct submission because direct pools are marked uninitialized.

The SDK registry supplies r9 addresses and market identities. This documentation update did not independently attest live deployment state or send trading transactions.

## Material corrections

| Earlier description | Current explanation and source evidence |
| --- | --- |
| Encrypted VDF sequencing stated as verified fast-path behavior | A tick/VDF protobuf exists; the examined commit/reveal handlers verify CTM signatures, not VDF proofs. POSq design is distinguished from verified implementation |
| Every order universally follows one fair sequence | AMQ ordering is market-local; direct instruction gates and maintenance/recovery paths matter |
| Broad replay immunity | 512-entry rolling cache with 20-slot retention; CTM zero-expiry traffic still relies on relayer replay discipline |
| Fixed deployment addresses and universal fee rates | Live configuration must be verified separately; market accounts carry fees and risk parameters |
| Every new action requires nonnegative initial health | The general check also permits non-worsening negative initial health; stricter paths are identified separately |
| Funding catches up all missed time after the one-hour cap | The update advances its timestamp to now; omitted time is not retained as catch-up debt |
| Perp bankruptcy reduces the quote bank's deposit index | Perp socialization uses funding accumulators/open interest; token bankruptcy uses bank-index accounting |
| A successful submission or reveal means a fill | Admission, queue resolution, matching, event consumption and settlement are distinct |
| Public FLP pre-deposits already own trading shares | Current public principal remains in escrow with no trading shares until graduation |
| FLP quote cash changes NAV with its USD oracle | Current NAV uses quote-native identity conversion and conservative cross-token prices |
| Burned withdrawal shares no longer count | Locked shares remain in pricing supply until funding |
| Recovery is available to anyone after simple batch age | Public triggers require recorded cash/health failure and grace; full escalation also requires proportional mode |
| Proportional recovery always needs manual re-delegation | Latest finish can restore the saved delegate and deposit state unless vetoed or blocked by breaker |
| Every full unwind must finish irreversibly | Admin can abort before closure; completed closure is permanent |
| All residual perp PnL must settle before terminal close | Negative residual cash is reserved; positive residual can be forfeited after the required grace |
| A deferred batch can only be funded at a later close | Latest guarded cure pays the oldest batch at its close ratio under a current-price floor and funding checks |

The latest source also adds approved pre-graduation immediate withdrawals, permissionless Depositor initialization, and expanded market-capacity/recovery accounts. The FLP chapters cover those entrypoints rather than treating older RC3 prose as the current contract.

## Source map

| Area | Primary implementation |
| --- | --- |
| Queue layout and limits | `core program: state/execution_queue_v5.rs` |
| Commit/reveal and recovery | `core program: instructions/execution_queue_v5.rs` |
| Intent encoding and dispatch | `core program: instructions/execution_queue.rs` |
| Matching and price-time keys | `core program: state/orderbook/` |
| Health and account checks | `core program: health/cache.rs`, `state/fermi_account.rs` |
| Funding and loss socialization | `core program: state/perp_market.rs` |
| Relayer allocation/delivery | `execution engine: main.rs` |
| Harness replay and server | `rust-harness/src/`, `ts/client/scripts/execution-queue/continuum-state-harness.ts` |
| POSq-facing interface | `ts/client/scripts/execution-queue/continuum_sequencer.proto` |
| FLP valuation and math | `flp-vault/programs/flp-vault/src/nav.rs`, `math.rs`, `accounting.rs` |
| FLP lifecycle and exits | `flp-vault/programs/flp-vault/src/instructions/` |
| FLP instruction ABI | `flp-vault/programs/flp-vault/src/instructions/` |
| Supported client API | Standalone SDK: `src/index.ts`, `src/accountClient.ts`, `src/trading.ts` |
| Client wire schema | Standalone SDK: `proto/ctm_sequencer.proto` |

Each mechanism chapter links the relevant files at the reviewed commit. The implementation repository is private, so those links require repository access. Public readers can use the explanations without access; maintainers can trace the details to code.

## Documentation validation

The rewrite retains the existing numbered-page routes and adds FLP, harness, security and operations chapters. Validation for this revision included:

- `npm run build`: generated the static site and search index.
- `npm run check:site`: verified all 40 content pages, internal links/anchors, local assets and editor entries.
- `npm test`: passed the six existing editor/authentication tests.
- `git diff --check`: checked patch whitespace.
- A local reference check resolved every pinned source path and local Markdown target; integer arithmetic independently reproduced the FLP worked example.

These checks validate the documentation artifact. They are not protocol execution tests or production health checks.

## Limits of the review

This was a source-based documentation review, not a new security audit or a deployment attestation. Program tests and historical qualification reports were used as supporting context, not represented as newly executed evidence. No latency benchmark was performed. The external POSq paper was inaccessible through the research tool, and no separate POSq implementation was supplied during the rewrite.

Before applying these docs to a deployment, match the executable hash/upgrade record, program IDs, group, instruction gates, account layouts, IDL and service builds. Keep devnet qualification and mainnet status separate. A release note or proposed launch date cannot replace that check.


## Implementation reference

Reviewed at `90267b20`. [execution_queue_v5.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [perp_market.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [recovery.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/recovery.rs) · [INTEGRATION_GUIDE.md](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/docs/INTEGRATION_GUIDE.md). Source links require access to the implementation repository.
