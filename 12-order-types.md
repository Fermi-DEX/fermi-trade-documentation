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

The trigger terms are committed through the client-order-ID construction; use the exact SDK encoding. Do not replace the identifier with an arbitrary random number for this path.

Trigger observation and release are off chain. The later order executes on chain through normal checks. A stop is therefore not a guaranteed exit price, and one-cancels-other coordination is not an atomic on-chain guarantee that adverse execution is impossible.


## Implementation reference

Reviewed at `90267b20`. [order.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/state/orderbook/order.rs) · [ctm_sequencer.proto](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/ts/client/scripts/execution-queue/ctm_sequencer.proto) · [trigger_forward.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/bin/service-mango-execution-engine/src/trigger_forward.rs). Source links require access to the implementation repository.
