# Frequently asked questions

## Is execution fully on chain?

Yes for the core matching and accounting path described here: the Solana program selects fills, checks risk and updates economic state. Off-chain services admit requests, sequence them, submit transactions and predict results. Predictions cannot settle a trade by themselves.

## What does FCFS guarantee?

The AMQ resolves admitted sequences in market order, subject to failure, expiry, gap and recovery rules. The book separately applies price-time priority. First-arrival fairness before commitment needs evidence from the sequencing layer, and enabled direct paths sit outside the normal AMQ stream.

## Can the sequencer change my order?

It cannot change a signed payload or its bound account context and still pass the signature/hash checks. It controls admission and sequence assignment in the reviewed path and can affect delivery. Administrative recovery and upgrade powers are separate trust boundaries.

## Does “accepted” mean “filled”?

No. Acceptance precedes commitment, reveal and matching. Even a successfully executed order can rest, partially fill or do nothing. Check the queue outcome and actual order/fill state.

## Is replay protection permanent?

No. The current on-chain duplicate guard is 512 entries with 20-slot retention, subject to capacity. Service-side discipline, client reconciliation and appropriate timing remain necessary.

## Can I always use direct fallback?

The reviewed r9 SDK preset rejects direct submission because its direct pools are marked uninitialized. For another deployment, fallback is available only when that market's direct pool exists, is enabled and can progress. It has capacity, expiry and speedbump rules and still depends on transaction inclusion and valid execution state.

## Why is profitable PnL not withdrawable?

Perp value must settle into a bank balance, and a token withdrawal needs liquidity and health. A positive mark-to-market value does not manufacture quote cash.

## When does FLP exposure begin and end?

Public pre-deposit exposure begins at graduation. Live deposits gain exposure when admitted and priced at close, not when later claimed. A withdrawal stays exposed while locked and deferred. Funding moves cash to redemption escrow and fixes the claim.

## Does an FLP withdrawal request fix a dollar amount?

No. Normal funding prices equity at the funding close. The guarded `cure_deferred` path can fund the oldest batch at its recorded close ratio only when current fee-adjusted value is no lower and funding checks pass.

## Can FLP shares be transferred or sold?

The mint uses Token-2022's NonTransferable extension. Exit through the vault's supported request/claim or terminal-redemption flow.

## Does the vault timelock protect against upgrades?

No. The program loader's upgrade authority is separate. Check the deployed authority and governance arrangement.

## Are the documented addresses and parameters live?

These docs describe a pinned source revision. The operator's current deployment record and chain accounts determine live program IDs, group, gates, markets and parameters.
