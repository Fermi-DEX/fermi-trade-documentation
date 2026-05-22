# Trust, Risk, and Failure Modes

The main trust boundary is simple: the on-chain program is authoritative;
off-chain services are helpful but limited.

## Component powers

| Component | Can do | Cannot do |
|---|---|---|
| On-chain program | Settle trades, enforce matching, compute health, run liquidation. | Act outside deployed code. |
| Relayer | Accept intents, assign sequences, commit hashes. | Move funds, alter signed payloads, replay consumed intents. |
| Executor | Reveal and execute committed intents. | Change payloads without failing hash checks. |
| Harness | Mirror and simulate state. | Change on-chain state. |
| Fanout | Broadcast events. | Create settlement events. |

## Main risks

- Smart contract bugs can affect funds or accounting.
- Oracle issues can affect health, funding, and liquidation.
- Thin liquidity can cause slippage and partial fills.
- Solana congestion can delay finality.
- Relayer or harness outages can degrade the user experience.

## Failure behavior

If the relayer is down, users can use the direct fallback path. If the
executor stalls, recovery paths can advance stuck queue items. If the
harness or fanout is unavailable, confirmed state remains on chain.

The design does not promise zero risk. It promises a narrow trust model:
custody and settlement live in public on-chain code, and the speed layer
does not become the final authority.
