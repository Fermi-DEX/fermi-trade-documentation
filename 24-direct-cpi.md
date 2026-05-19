# 23 · Direct CPI Integration

A Solana program can place, cancel, or settle orders on Fermi by
**CPI'ing directly into the on-chain program** — without involving
the relayer at all. This is the right pattern for:

- Strategy / vault programs that want to trade on behalf of their
  depositors.
- AMM / hedger contracts that periodically rebalance into a perp.
- Bots that prefer to stay fully on chain.

## Two integration paths

| Path | When |
|---|---|
| **Anchor IDL calls** (`perp_cancel_order`, `token_deposit`, `perp_settle_pnl`, …) | For permissioned, direct, non-queued operations. |
| **`execution_queue_v5_enqueue_direct_market`** | For placing an order via the v5 queue. Includes Ed25519 preinstruction. |

Most cross-program integrations need both: a direct enqueue for the
place-order, and Anchor calls for the synchronous reads / cancels /
settles.

## Prerequisites

In your `Cargo.toml`:

```toml
[dependencies]
fermi-v1 = { path = "...", features = ["cpi", "enable-gpl"] }
```

The `cpi` feature exposes the CPI module
(`fermi_v1::cpi::accounts::*` and `fermi_v1::cpi::*` functions). The
`enable-gpl` feature is required by the licensing of certain
dependencies — see `LICENSE` in the program crate.

## Example: place a perp order from a vault program

```rust
use fermi_v1::cpi::accounts::ExecutionQueueV5EnqueueDirect;
use fermi_v1::cpi::execution_queue_v5_enqueue_direct_market;
use fermi_v1::state::{ExecutionQueueV5DirectEnqueueArgs, ...};

pub fn rebalance(ctx: Context<Rebalance>, intent_payload: Vec<u8>, signature: [u8; 64]) -> Result<()> {
    // 1. Build the Ed25519 preinstruction the on-chain program will read.
    //    The preinstruction must verify `intent_payload` signed by `ctx.accounts.vault_authority`.
    //    The canonical message construction is defined in
    //    `fermi_v1::state::execution_queue_v5::canonical_user_intent_message_v2`.

    // 2. CPI into the direct enqueue ix.
    let cpi_accounts = ExecutionQueueV5EnqueueDirect {
        group:               ctx.accounts.fermi_group.to_account_info(),
        execution_queue:     ctx.accounts.execution_queue.to_account_info(),
        perp_market:         ctx.accounts.perp_market.to_account_info(),
        owner:               ctx.accounts.vault_authority.to_account_info(),
        fermi_account:       ctx.accounts.vault_fermi_account.to_account_info(),
        oracle:              ctx.accounts.oracle.to_account_info(),
        sysvar_instructions: ctx.accounts.sysvar_instructions.to_account_info(),
        // ... other accounts ...
    };
    let cpi_ctx = CpiContext::new(
        ctx.accounts.fermi_program.to_account_info(),
        cpi_accounts,
    );

    execution_queue_v5_enqueue_direct_market(cpi_ctx, ExecutionQueueV5DirectEnqueueArgs {
        intent_payload,
        signature,
        // min_execute_slot / expires_at_slot / etc.
    })?;

    Ok(())
}
```

The exact account ordering, args struct, and feature flags can shift
between releases — always re-generate against the IDL of the
deployed program:

```bash
solana program dump FRMiKrj2hQGvcZQtSDdiFRZ4cmaTjuc1QVkM2B5ShUvA fermi_v1.so
anchor idl fetch FRMiKrj2hQGvcZQtSDdiFRZ4cmaTjuc1QVkM2B5ShUvA -o fermi_v1.json
```

## Canonical intent message

The Ed25519 preinstruction must sign exactly the bytes that the
on-chain program will recompute from the payload + accounts:

```rust
let msg = fermi_v1::state::execution_queue_v5::canonical_user_intent_message_v2(
    &intent_payload, &account_list,
);
let signature = ed25519::sign(msg, signing_key);
```

If you build the preinstruction with a different message (different
byte ordering, missing accounts, different domain separator) the
reveal step will return `Custom(...) ExecutionQueueV5SignatureMismatch`
and your tx will fail.

The canonical message format includes a **domain separator** so
direct-CPI signatures cannot be replayed against a different program
or chain.

## Direct cancel (no queue)

A cancel doesn't need to go through the queue at all — the on-chain
program exposes `perp_cancel_order`, `perp_cancel_order_by_client_order_id`,
and `perp_cancel_all_orders` as Anchor instructions:

```rust
let cpi_accounts = fermi_v1::cpi::accounts::PerpCancelOrder {
    group:           ctx.accounts.fermi_group.to_account_info(),
    account:         ctx.accounts.fermi_account.to_account_info(),
    owner:           ctx.accounts.authority.to_account_info(),
    perp_market:     ctx.accounts.perp_market.to_account_info(),
    bids:            ctx.accounts.bids.to_account_info(),
    asks:            ctx.accounts.asks.to_account_info(),
};
let cpi_ctx = CpiContext::new(
    ctx.accounts.fermi_program.to_account_info(),
    cpi_accounts,
);
fermi_v1::cpi::perp_cancel_order(cpi_ctx, order_id)?;
```

The cancel is synchronous — it touches the book directly. No reveal,
no commit, no replay cache. Useful for `closeMargin` / emergency
flows where queue latency is unacceptable.

## Settling P&L from a contract

```rust
fermi_v1::cpi::perp_settle_pnl(cpi_ctx, /* nothing */ ())?;
```

Pass two Fermi account infos (the +PnL and -PnL sides) plus the
perp market, settle bank, settle oracle, and the caller's
incentive-recipient token account.

## Reading state from another program

You can `Account::try_from(&perp_market_ai)` (with the right Anchor
type) or use the lower-level `fermi_v1::accounts_zerocopy` helpers.
For the most-common reads (oracle price, book, hupnl), the on-chain
program exposes pure functions in `fermi_v1::state::*` you can call
directly:

```rust
use fermi_v1::state::PerpMarket;

let perp = PerpMarket::try_deserialize(&mut data.as_ref())?;
let oracle_state = perp.oracle_state(&oracle_acc_infos, Some(now_slot))?;
let price        = oracle_state.price;
```

Always check the oracle staleness *before* using the price for
business logic — otherwise a stale oracle can creep into your own
program's accounting.

## Operator setup for new direct-CPI integrations

Before a downstream program can submit direct intents, the Fermi
operator typically:

1. **Creates the execution queue** for the relevant market (`execution_queue_v5_create_market`).
2. **Initialises the direct pool** for that queue (`execution_queue_v5_init_direct_pool`).
3. **Whitelists the downstream program** if required by governance.

If you're integrating today, ask the operator team to confirm those
three steps are done for the markets you want to trade. The
`direct-cpi-sdk.md` doc in `fermi-v1/docs/` has the live admin
checklist.

## Pitfalls

- **Wrong account ordering.** The CPI account struct must match
  the on-chain definition exactly. Anchor IDL handles this for
  TypeScript callers; from another Rust program it's on you to
  re-generate the `Accounts` struct.
- **Forgetting the Ed25519 preinstruction.** A direct enqueue
  without the preinstruction fails the signature verification step.
  The preinstruction *must* be at the index the program expects
  (typically `0`).
- **Reusing intent payloads.** The replay cache will reject a
  re-submitted intent for ~10 slots. Always include a fresh
  `client_order_id` or nonce.
- **Cross-program signers.** A PDA from your program can sign by
  using `invoke_signed` with the right seeds. The Fermi program
  accepts the signing PDA as the Fermi account `owner` so long as
  the PDA is set as the account authority via `account_edit`.
