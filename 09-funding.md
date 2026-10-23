# Funding

Funding transfers value between long and short positions. A positive funding rate makes longs pay shorts; a negative rate reverses the direction. Funding changes perp quote accounting. It is separate from a token-bank withdrawal or a payment to an external wallet.

## The calculation

The program walks each side of the book to the configured `impact_quantity`. With both impact prices available:

```text
impact_mid_lots = integer average of impact bid and ask
rate = clamp(native_impact_mid / oracle_price − 1,
             min_funding, max_funding)
dt = min(now − funding_last_updated, 3,600 seconds)
delta_per_base_lot = oracle_price × base_lot_size × rate × dt / 86,400
```

The configured rate is per day. With only a bid impact price, the rate is `max_funding`; with only an ask, it is `min_funding`; with neither, it is zero. A thin book may fail to supply an impact price even if it has some orders.

The same delta is added to the long and short cumulative indexes. The sign of the position determines whether that update debits or credits quote value.

## When it updates

A funding instruction updates the market, and order placement updates funding before modifying the book. There is no autonomous on-chain timer. Keepers must submit transactions during quiet periods. Calls at or before the recorded timestamp do not apply another update.

The one-hour cap has an important consequence: after a long gap, that call charges at most one hour and advances the timestamp to now. The omitted time is **not** accumulated as a backlog that later calls automatically recover.

## Position accounting

Each position records the funding index it has settled. For a long, the funding debit is base lots times the difference between current long funding and its recorded mark. A short uses the short index and its signed base amount. Health and valuation must include funding that has accrued but is not yet folded into stored quote state.

Example only: at a stable $10,000 notional and a constant positive 0.01% daily rate, one hour costs the long about $0.04167. Actual updates use integer lots, fixed-point values and the rate at each update.

A funding-history display should separate observed updates, accrued position value and settled token transfers. See [PnL](16-entry-pnl.md).


## Implementation reference

Reviewed at `90267b20`. [perp_market.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/state/perp_market.rs) · [fermi_account_components.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/state/fermi_account_components.rs) · [perp_update_funding.rs](https://github.com/Fermi-DEX/fermi-v1/blob/90267b20df99d0eacf35dbd407c67c33d809172b/programs/mango-v4/src/instructions/perp_update_funding.rs). Source links require access to the implementation repository.
