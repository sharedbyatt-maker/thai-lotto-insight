# ThaiLotto Insight

ThaiLotto Insight is a public, mobile-first Thai Government Lottery results and historical analytics application. It never presents statistical patterns as guaranteed predictions.

## Current architecture

- Web application: Next.js-compatible Vinext on Cloudflare Workers
- Database: Cloudflare D1 (SQLite), not PostgreSQL
- Primary provider: Government Lottery Office (GLO)
- Public pages: home, results, statistics, number pages, prediction history, methodology
- Protected page: /admin, restricted by ChatGPT sign-in and the server-side ADMIN_EMAIL allowlist

## Data integrity

Production pages never invent missing results, picks, accuracy, or backtest metrics. Until 100 verified results are synchronized, the interface says insufficient historical data and suppresses scores. Test data exists only inside tests.

## Data flow

The protected importer uses the official GLO results-by-date API. It persists a restartable candidate-date queue, validates every prize format without converting digit strings to numbers, deduplicates by draw date, stores endpoint/resource/hash metadata, quarantines malformed payloads, and records success or failure.

Exact official API research is in [docs/GLO_RESOURCES.md](docs/GLO_RESOURCES.md). Licensing and commercial-use uncertainty are documented in [DATA_LICENSE.md](DATA_LICENSE.md).

## Configuration

The deployment requires a D1 binding named DB and ADMIN_EMAIL set to the owner's email. Secrets belong in the deployment environment, never in source.

## Run and test

1. Install Node.js 22.
2. Run npm ci.
3. Run `npm run db:generate` after schema changes.
4. Run `npm run lint` and `npm run typecheck`.
5. Run `npm run test:unit` and `npm run test:integration`.
6. Run `npm run build`.

## Admin

Open /admin and sign in with ChatGPT using the account matching ADMIN_EMAIL. The sync action is server-authorized.

## Backtest interpretation

A walk-forward test scores draw N using draws strictly before N. Baselines are Top-1 1%, Top-3 3%, Top-5 5%, and Top-10 10%. Small samples are not evidence of predictive advantage.

## Digit-first candidate engine

The experimental last-2 engine models tens and units independently, then forms each pair from `P(tens) × P(units)`. It calculates 10/20/30/60/100-draw and all-history frequencies, exponentially weighted recency, position gaps, first-order Markov transitions, repeats, reverse pairs, doubles, and low-weight pair interactions. A chronological TRAIN/VALIDATION/LOCKED TEST comparison and feature ablation decide which candidate features are retained. The production engine is not replaced automatically.

Sparse observations are Bayesian/Laplace-smoothed. A digit uses `(count + 1) / (n + 10)`, shrinking toward 10%; an exact pair uses `(count + 1) / (n + 100)`, shrinking toward 1%. First-order transitions use `(transition count + 1) / (previous-digit count + 10)`. Second-order Markov remains disabled until at least 500 verified draws make it eligible for a separate chronological experiment. Gap and hot/cold labels are descriptive and never mean a number is due.

The clean-room donor audit and Phase 1 scientific boundaries are documented in [docs/REFERENCE_FEATURE_AUDIT.md](docs/REFERENCE_FEATURE_AUDIT.md). Pattern Lab never substitutes the last two digits of the first prize for the official GLO last-2 prize.

## Provider recovery

If GLO is unavailable, the site keeps the last verified result and logs the failure. Never add a fallback without documenting its provenance and validation.

Provider-specific parsing is isolated in `lib/providers.ts`. Every provider must return the normalized `LotteryDraw` interface. Analytics, backtests, prediction history, the Number Checker, and public pages read normalized database rows and do not depend on GLO response fields.

## Commercial monetization guard

Advertising is disabled while the data license remains unresolved:

- `COMMERCIAL_MONETIZATION_ENABLED=false`
- `COMMERCIAL_DATA_LICENSE_APPROVED=false`

The production build refuses an attempt to enable monetization without explicit commercial data-license approval. Runtime code also reports the guard state and never enables ad components. Do not change either setting until written commercial reuse permission or a commercially compatible replacement provider is verified and documented.

## Backup and recovery — simple instructions

1. Sign in to `/admin` with the configured admin account.
2. Under **Backup and exports**, download **Full backup JSON** after every new draw. Keep copies in at least two safe locations, such as your computer and a private cloud drive.
3. CSV buttons separately export verified draws, rejected draws, prediction history, and backtest results. The engine configuration is exported as JSON. Digit fields remain quoted strings so leading zeroes are preserved.
4. If production data looks corrupted, stop manual syncs and download one final backup if the admin page still works. Do not edit the JSON file.
5. Ask ChatGPT Work to deploy an empty recovery database and restore the newest `thai-lotto-insight-backup.json`. The protected restore API refuses to overwrite a non-empty database and requires explicit confirmation. A partially interrupted restore can be safely resumed because inserts are idempotent.
6. After restoration, run **Audit all draws**, confirm zero anomalies, then run analysis. Compare verified count, earliest/latest dates, prediction runs, and engine version with the backup report before reopening normal sync.

The full JSON backup contains normalized draws, rejected records, queue state, engines, locked predictions, evaluations, statistics, backtests, optimizer/ML records, sync history, source verifications, provider health, audits, and system events. This prevents the verified historical set from depending on one live D1 database.

## Freshness and source health

Public data becomes `STALE DATA` when no successful synchronization has occurred for more than 72 hours. Public APIs and pages expose the data cutoff, last successful sync, active source, and freshness state. Provider monitoring retains request success/failure, validation failures, latency, and consecutive failures; verified database data remains readable during a temporary provider outage.

## Deployment

Push changes to main. CI runs lint, tests, and the production build. Publish only a passing commit. Database migrations are included with the deployment package.
