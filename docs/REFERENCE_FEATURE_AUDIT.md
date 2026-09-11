# Phase 1 reference feature audit

Baseline recorded before Phase 1: source commit `c48775abc99859fd5d754b650608fed0eab821bd`, active engine `v3.1-stat-2026-09-01-n206`, 206 verified draws from 2017-12-30 through 2026-09-01, 85 passing tests, and a passing production build. The commit is the rollback point.

## Reference boundaries

`wajidbux/thai-lotto-predictor` was reviewed only as an idea donor. Its useful ideas are recency-weighted frequency, position-specific digit counts, running-digit presentation, recent-versus-long-term comparison, and decay experimentation. ThaiResults was treated only as general product inspiration; no source, layout, text, branding, graphics, or assets were copied.

The following reference behavior is explicitly rejected: treating `firstPrize.slice(-2)` as the official last-2 prize, using recent winners as predictions, fallback prize fabrication, 3Row/4Row coverage metrics, payout/profit as predictive evidence, and high hit-rate claims without their candidate coverage baselines.

## Clean-room challenger

The challenger consumes only the verified GLO `last2` column for its prediction target. Tens and units distributions are built independently before pair formation. Digit observations use `(count + 1) / (n + 10)`, shrinking toward 10%; exact pairs use `(count + 1) / (n + 100)`, shrinking toward 1%; first-order transitions use `(transition_count + 1) / (previous_digit_count + 10)`.

Decay candidates are 0.90, 0.92, 0.94, 0.96, 0.97, and 0.98. Window candidates use combinations of 10, 20, 30, 50, 100, and all prior draws. Selection is chronological: TRAIN searches parameters, VALIDATION selects experimental features, and only the selected challenger is reported on LOCKED TEST. Non-selected Pattern Lab candidates do not receive locked-test tuning.

Previous-first-prize formulas use the previous draw's six-digit first prize only and are compared against the next draw's official GLO last-2 digits. Same-draw formula evaluation is forbidden by tests. These formulas, calendar slots, regimes, gaps, Markov transitions, repeats, reverse pairs, doubles, and sum distributions remain experimental or descriptive unless out-of-sample evidence supports promotion.
