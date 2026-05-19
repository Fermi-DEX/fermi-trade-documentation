# 28 · Support

## I'm a trader

If your order won't land, your fills look wrong, or your account
behaves unexpectedly:

1. **Check the trace endpoint first.**
   `GET <harness>/trace/sequence/<market>/<seq>` returns every stage
   of an intent's lifecycle — accepted, committed, submitted,
   revealed, executed, autodropped — with timestamps, blockhashes,
   and error texts. 90 % of "lost order" reports turn out to be
   intents the relayer never accepted; the trace shows that
   immediately.

2. **Check the harness `/healthz` and the relayer `/healthz`.**
   If either is degraded the operator is already on it; retries
   won't help.

3. **Check oracle freshness.** If the oracle for your market is
   stale, every order reverts at reveal time.
   `GET <harness>/state/oracles` shows last-update slots for every
   oracle.

4. **Reload the SDK's view of your account.** A stale local
   `FermiAccount` view (e.g. you cached an old token balance) will
   produce intents that fail the relayer's pre-check with
   `STALE_ACCOUNT`. `await fermiAccount.reload(client)` and retry.

If after the above you still can't tell what's wrong, gather:

- The intent's `client_order_id` (and `sequence` if you have it).
- The relayer's response (status code, reason, `tx_signature` if
  any).
- The harness's `trace/sequence` JSON for that intent.
- Approximate timestamps and the market.

…and reach out via the channels below.

## I'm an integrator / developer

For SDK questions, CPI integration, or running your own relayer:

- The internal design docs in `fermi-v1/docs/` are the most
  detailed reference.
- The repo's `AGENTS.md` documents conventions for code
  contributions.
- For test environments, see `fermi-v1/usage_guide.md` and
  `fermi-v1/setup.md`.

## I'm a security researcher

For vulnerabilities in the on-chain program, the relayer, the
harness, or the SDKs:

- **Do not file a public GitHub issue.**
- Use the private disclosure channel published in `SECURITY.md` at
  the repo root.
- Include reproduction steps, impact assessment, and (if relevant)
  a proof-of-concept.
- The bug-bounty terms are described in `SECURITY.md`.

## Channels

| Purpose | Where |
|---|---|
| Trader / general questions | The official Discord / Telegram for the deployment (link via the front-end's "Support" footer) |
| Integration / SDK | Same Discord, `#integrations` channel; or open a discussion on the repo |
| Security disclosure | `security@<deployment-domain>` (see `SECURITY.md`) |
| Operator escalation | Reach out to the operator team via the same Discord (`#operations`) — for production outages they typically respond within minutes |

## What to expect on response time

- **Trader questions**: usually within a few hours during active
  hours.
- **Integration questions**: 1-2 business days.
- **Security reports**: acknowledgement within 24 hours, triage and
  remediation per the `SECURITY.md` SLA.

## Operational status

Live status of relayer / harness / fanout, plus historical incidents,
is published at the operator's status page (linked from the
front-end footer). Subscribe there for downtime notifications.

## Contributing

Pull requests against the open-source components are welcome. See
`fermi-v1/AGENTS.md` for code-style conventions and the test matrix
expected on PRs. For larger architectural changes, please open a
discussion first — the project's roadmap and "agreed-on" direction
is captured in `fermi-v1/v5-roadmap.md` and successors.
