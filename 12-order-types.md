# Order types, expiry and triggers

An order combines a side, base-size cap, quote budget, client order ID, self-trade behavior, reduce-only flag and price behavior. Choose the behavior before signing; the relayer cannot safely edit it afterward.

| Type | Behavior |
| --- | --- |
| Limit | Take eligible opposing liquidity up to the limit; post an eligible remainder |
| Immediate-or-cancel (IOC) | Take available liquidity within bounds; do not rest the remainder |
| Market | Immediate taking behavior with aggressive price semantics; still subject to size, quote, program and liquidity limits |
| PostOnly | Post only if it would not cross; a crossing request can produce no order |
| PostOnlySlide | Adjust the posting price away from crossing according to the book rules |
| Oracle-pegged | Derive price from oracle plus an offset, subject to peg-limit and validity rules |

A market order does not guarantee a fill at the last displayed price. An IOC with an explicit worst price is often easier to reason about when the objective is bounded slippage.

## Reduce-only

Reduce-only limits an order to reducing existing exposure under the program's position checks. It does not guarantee that the book has a counterparty or that a stale oracle, unavailable account, paused instruction or queue delay will allow execution.

## Two clocks

The queue envelope uses slots: `min_execute_slot` and `expires_at_slot`. The order payload can carry a Unix-second expiry / time-in-force that controls order eligibility. A valid queue envelope does not make an expired order valid. Zero has field-specific meaning; for CTM envelope expiry, zero permits no envelope expiry.

## Stop-loss and take-profit

The current gRPC schema supports `trigger_order` terms. These requests use intent version 3 and are withheld by the trigger-order keeper. The keeper submits the underlying intent when the configured oracle condition holds. The response has a trigger ID/status rather than an ordinary committed sequence.

The service trigger terms are committed through its client-order-ID construction. The current standalone SDK does not expose this encoding. Do not replace the identifier with an arbitrary random number for this path.

Trigger observation and release are off chain. The later order executes on chain through normal checks. A stop is therefore not a guaranteed exit price, and one-cancels-other coordination is not an atomic on-chain guarantee that adverse execution is impossible.


## SDK support boundary

The current SDK exposes limit, IOC, post-only, market and post-only-slide placement through `submitPerpOrderViaRelayer`. Its protobuf has no trigger-order fields. The trigger mechanism described here is service implementation context, not an r9 SDK usage recipe.

## Implementation reference

Protocol reviewed at `90267b20`; standalone SDK references at `5318a579`. [order.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [ctm_sequencer.proto](https://github.com/Fermi-DEX/Fermi-v1-sdk/blob/5318a579dbb10ea34c182df9330a631a8aea2197/proto/ctm_sequencer.proto) · [trigger_forward.rs — bin source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/bin). Source links require access to the implementation repository.
