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
3. Run npm run db:generate after schema changes.
4. Run npm test to build and execute tests.
5. Run npm run lint for code-quality checks.

## Admin

Open /admin and sign in with ChatGPT using the account matching ADMIN_EMAIL. The sync action is server-authorized.

## Backtest interpretation

A walk-forward test scores draw N using draws strictly before N. Baselines are Top-1 1%, Top-3 3%, Top-5 5%, and Top-10 10%. Small samples are not evidence of predictive advantage.

## Provider recovery

If GLO is unavailable, the site keeps the last verified result and logs the failure. Never add a fallback without documenting its provenance and validation.

## Deployment

Push changes to main. CI runs lint, tests, and the production build. Publish only a passing commit. Database migrations are included with the deployment package.
