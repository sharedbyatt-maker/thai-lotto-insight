# Phase 2 search discovery map

| URL | Purpose | Primary topic | Indexable | Canonical | Links in/out |
|---|---|---|---|---|---|
| `/results` | Verified archive and date filters | Thai lottery results archive | Yes | Self | Home; draw pages |
| `/results/YYYY-MM-DD` | One verified draw with historical context | Thai Government Lottery result by date | Yes | Self | Archive, adjacent draws, number, statistics |
| `/statistics` | Analysis discovery hub | Thai lottery statistics | Yes | Self | Header; all analysis routes |
| `/statistics/digit-frequency` | Position frequency windows | Digit frequency | Yes | Self | Hub, 2-digit, methodology |
| `/statistics/tens-units` | Explain and compare positions | Tens and units | Yes | Self | Hub, 2-digit, methodology |
| `/statistics/hot-cold` | Descriptive recent-vs-long frequency | Recent frequency history | Yes | Self | Hub, methodology |
| `/statistics/gap` | Historical digit gaps | Digit gap | Yes | Self | Hub, methodology |
| `/statistics/sum` | Sums 0–18 | Last-2 sum distribution | Yes | Self | Hub, methodology |
| `/statistics/even-odd` | Parity windows | Even/odd history | Yes | Self | Hub, methodology |
| `/statistics/high-low` | 0–4 / 5–9 regimes | High/low history | Yes | Self | Hub, methodology |
| `/statistics/pairs` | Search 00–99 occurrence history | Exact pair history | Yes | Self | Hub, number pages |
| `/number/00`–`/number/99` | Number-specific verified history | Thai lottery number history | Yes | Self | Draw pages, pair history, 2-digit |
| `/backtest` | Transparent model evaluation | Model backtest | Yes | Self | Statistics, 2-digit, methodology |
| `/data-sources` | Source and validation policy | GLO data trust | Yes | Self | Statistics, methodology, results |
| `/admin`, `/api/*` | Operations and machine endpoints | Private/internal | No | None | Excluded from sitemap |

Language is stored as a client preference rather than encoded in separate locale URLs, so the site intentionally does not publish fabricated `hreflang` alternatives.
