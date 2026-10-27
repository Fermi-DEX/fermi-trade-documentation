# Mainnet deployment

This page records the mainnet deployment and the public-reader observation on 27 October 2026.
The observed slot was `462120926`.
Addresses identify the deployment. Lifecycle, balances, permissions, and parameters can change.

## Current lifecycle

At this observation, the vault was in pre-deposit mode. Public pre-deposits were open, and a trading delegate was configured.
Graduation had not occurred. The on-chain graduation schedule field was null.
Read the live lifecycle before you select a deposit or withdrawal path.

## Addresses

| Field | Value |
|---|---|
| Network | `Solana mainnet-beta` |
| Release / vault version | `RC6.1 / 4` |
| FLP program | `FLPRrDPN5tJpLx6wY6FUiGFN5Kws8gHUCYMCcs6Goa9Q` |
| FLP ProgramData | `Fekec2bVaipgZ6XsKEpSqFobSnjNEUgwfi4qxGNsq4Px` |
| Core program | `FRMiX94PWHbndvySq8xyRx185GvPeggUeKaLmZgVdd4` |
| Fermi group | `2mDvxS4A6bJyR3RjLwvBWeNuFvCAaQ26ss7w1jUChRse` |
| Vault ID | `1` |
| Vault account | `8aHdjxJzec6CfBngSFZYQvqZsBtXWXG6j1C3rW799pbP` |
| Vault authority PDA | `7iNQuvuwAdefKQHxF7BNrPqYc4u3sfaSThR34sJom2Eo` |
| Fermi trading account | `AHSh1j6dGQR3gXzARWZWH2mSmX86zdA98TjiGks1wr2J` |
| Share mint | `C5WNDho4oWkmBhKXNnZKuai7e2FCnyqPG15FDjPoSrbD` |
| USDC mint | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| USDC bank | `147eAzRXsDhNnL1We6qDXN7XfDrRVJvLszp59v1XnEXv` |
| Deposit escrow | `4mYmpiUzi2ehdWphdU7pM8ytEpFoisHw8DHNjuWU5esN` |
| Redemption escrow | `GdkEsV8PpKpdrEYiP2S6yS8gD1oYbAHR8vhb4kagS47t` |
| Idle USDC account | `6TMQtEDX36Lafoc1ttUrqeB9L6RdzZgv1h1gZ2NKLtoe` |
| Funding-window account | `8UsgBtHYHsmc8BW9WRBkiPuZjWUwgrvjGc6cej3YBd6k` |
| Recovery sidecar | `D8fU66ZHQGfdwAsznwfFN4wQrqJqBJ9sibUBZQ4mRsYW` |

The share mint uses Token-2022 with non-transferable shares. USDC uses six decimals, and shares also use six decimals.
The FLP program address is the same on devnet and mainnet. The RPC network and vault account distinguish the deployments.

## Parameters at the observation

| Parameter | Value |
|---|---|
| Epoch duration | 24 hours |
| Request cutoff | One hour before epoch end |
| Ordinary funding window | Two hours from scheduled epoch end |
| Vault cap | 100,000 USDC |
| Minimum deposit | 10 USDC |
| Minimum withdrawal | One share, with the full-balance exception |
| Positive unsettled-PnL haircut | 100% for withdrawal NAV |
| Post-withdraw Init health ratio floor | 30%, asserted by the core health instruction for ordinary core-funded payouts |
| Deposit / withdrawal fees | 0 / 0 basis points |
| Management / performance fees | 0 / 0 basis points |
| Parameter timelock | 0 seconds |
| Numerical drawdown breaker | Disabled |
| Numerical Init-ratio breaker | Unsupported by this release |
| Proportional / full recovery grace | 26 hours / seven days, subject to eligibility |
| Recovery oracle band | 75 basis points |
| Maximum recovery step | 50,000 USDC |

The configured markets are SOL-PERP (0), ETH-PERP (1), and BTC-PERP (2).
Account capacity is 13 perp slots, 64 perp order slots, and one token slot.
Capacity does not mean that all slots contain positions or active quotes.

## Authorities

| Role | Public key |
|---|---|
| Administrator | `7tkj9XQPLa6KnZNZS8AkHSRBuAKtNKnPPE627thxzJGn` |
| Guardian | `22CCFT4YpYxkjh5WBjxA2gBhE4Au8CDF77Ez1Wf1uCKh` |
| Trading delegate | `3V3kPiESqiRoEdHGABBomr9NxYoJG8CrnDxjjJAKMt16` |
| FLP upgrade authority | `9o5DaZRiyS4cvaFy2jaPxPHKeKGfNt1PeUGgpPPWi3jw` |
| Core upgrade authority | `2DdpNWCrd5QHiLmkADtomoA4ojVdhQ7hSsBX4jZ6jjg3` |

These are separate authorities. The vault authority PDA is not a private wallet key.
The current zero timelock is not an assurance of advance notice for configuration changes.

## Deployment and verification

The FLP program was deployed on 26 October 2026, in slot `461700429`.
The deployed ELF contains 1,776,216 bytes.

```text
ELF SHA-256:
4cd0f7787be53a52195ff21bc34797f3eb40de1810d17443d883f1533f59f36e

Solana executable hash:
5e03fd650b2d724636460edfa8f46d2b1435a4530f9999855d5573504b12c263

Verified public source commit:
623f113075bd124948eabac8589bfbe8c53b11e8
```

The ELF SHA-256 covers the full ELF. The Solana executable hash uses the verifier's padding-normalized representation.
These are different hash definitions, so their values differ.

- [Public FLP source and build instructions](https://github.com/Fermi-DEX/fermi-v1-programs/tree/623f113075bd124948eabac8589bfbe8c53b11e8/flp)
- [Independent FLP verification status](https://verify.osec.io/status/FLPRrDPN5tJpLx6wY6FUiGFN5Kws8gHUCYMCcs6Goa9Q)
- [FLP on Solscan](https://solscan.io/account/FLPRrDPN5tJpLx6wY6FUiGFN5Kws8gHUCYMCcs6Goa9Q)
- [Deployment transaction](https://solscan.io/tx/5BjuWXMmgnLp7zS9E4Cx99aby6Jsny5QuHUW7yz9SoXc3f7RV3394U9dPKebVSudwbnoXHVDkosXZyagsQySju4h)

The FLP remote verification passed on 27 October 2026.
Core verification is separate. At publication, its authority-signed remote verification remains pending.
The core's recorded ELF SHA-256 is `29c6167e1e0eb4577215cf5a85a9646ed36b97c479ace0a71631b7fe71358aa9`.
Its program address is `FRMiX94PWHbndvySq8xyRx185GvPeggUeKaLmZgVdd4`.
The FLP verification badge does not establish a separate verification result for the core.

## Public services

The mainnet reader is `https://flp-mainnet.34-116-238-207.sslip.io`.
Its [deployment record](https://flp-mainnet.34-116-238-207.sslip.io/deployment.json) and [API guide](38-flp-integration.md) provide integration details.
The reader is read-only. It does not execute wallet transactions.

The older hosted devnet FLP service is paused. Its old URL is not a live mainnet endpoint.
