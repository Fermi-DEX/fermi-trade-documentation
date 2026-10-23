# Self-trade behavior

The matcher detects a self-trade when an incoming order would match a resting order owned by the **same FermiAccount**. Sharing a wallet owner across different accounts does not make them the same account for this comparison.

| Mode | What the matcher does |
| --- | --- |
| `DecrementTake` | Decrements the matched quantities and excludes that self-trade volume from normal trade fees; the code emits the corresponding event bookkeeping |
| `CancelProvide` | Removes the resting maker order through an out event and continues looking for other liquidity |
| `AbortTransaction` | Returns `WouldSelfTrade`; ordinary transaction rollback rules apply |

In `DecrementTake`, do not assume the resting quantity is untouched: the match loop reduces both incoming and opposing quantities. An external volume or PnL indexer must distinguish self-trade decrements from economic trades. The taker trade log provides decremented-volume fields for that purpose.

Example: a strategy rests a sell and then submits a crossing buy from the same account. `CancelProvide` removes the sell; it does not create a new economic position between the account and itself. With `AbortTransaction`, the request fails instead. Choose this behavior explicitly in a market-making client.

When submitted through the AMQ, a dispatch error also interacts with queue failure handling. Check the recorded item outcome rather than assuming that every self-trade error leaves the queue in the same state.


## Implementation reference

Reviewed at `90267b20`. [book.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs) · [order.rs — programs source tree](https://github.com/Fermi-DEX/fermi-v1/tree/90267b20df99d0eacf35dbd407c67c33d809172b/programs). Source links require access to the implementation repository.
