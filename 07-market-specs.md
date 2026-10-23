# Market configuration and units

A PerpMarket binds a contract to its group, market index, settlement token, oracle, bids, asks and event queue. Its parameters determine the tradable increments and risk treatment. Read these accounts at a known slot before constructing orders.

| Configuration | Why it matters |
| --- | --- |
| `perp_market_index`, group | Identify the target and its AMQ |
| `base_lot_size`, `quote_lot_size` | Convert user amounts to integer trade units |
| Oracle and oracle configuration | Determine valid reference data and freshness/confidence limits |
| Initial and maintenance base weights | Determine risk cost of long and short exposure |
| Overall asset weights | Determine how positive perp value contributes to health |
| Maker/taker and penalty fees | Determine trade costs and rebates |
| Funding bounds and impact quantity | Determine funding calculation |
| Settlement limits | Bound PnL conversion over time |
| Reduce-only / force-close state | Restrict actions during risk management |
| Book and event-queue accounts | Required execution state |

## Convert before signing

```text
base_lots = base_native / base_lot_size
price_lots = native_price × base_lot_size / quote_lot_size
```

These are integer quantities. The client must choose rounding that respects the user's size and price bounds. For a buy, rounding a maximum price upward can authorize spending more than intended. For a sell, rounding a minimum price downward has the same problem.

Example only: if one base lot is 0.01 asset and one quote lot is $0.01, a price of $100 corresponds to 100 price lots. A 0.25-asset order has 25 base lots. Actual markets can have different decimals and lot sizes.

## Capacity and risk are distinct

A configured perp slot in an account is storage. A market's risk weights constrain exposure. An open-order limit constrains resting orders. None of these alone defines a guaranteed maximum leverage or fill size.

FLP market-capacity expansion in the reviewed source permits up to 13 perp slots and 64 open-order slots and adds a recovery sidecar. That is vault integration behavior, not evidence that every deployed vault already uses 13 markets.


## Implementation reference

Reviewed at `90267b20`. [perp_market.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [capacity.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/flp-vault/programs/flp-vault/src/instructions/capacity.rs). Source links require access to the implementation repository.
