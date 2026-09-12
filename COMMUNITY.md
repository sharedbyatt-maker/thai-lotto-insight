# ThaiLotto Insight Community

Phase 3 is a transparent community-picks layer for the official GLO **Last 2-Digit Prize**. It is not a betting product and never feeds community choices into the statistical prediction engine.

## Identity and privacy

- Authentication uses the hosting platform's Sign in with ChatGPT identity headers.
- A stable provider user ID is stored internally. Email is not stored in community tables.
- Public profiles expose only a sanitized display name, a one-way public member ID, post-deadline picks, and settled performance.
- Display names are 2–30 characters; reserved official/admin names and control/markup characters are rejected.
- Account deletion removes favorites and private notifications, soft-deletes the public identity, and retains pseudonymous locked submissions only as an integrity/audit record.

## Submission lifecycle

1. The server derives the only eligible target from the existing future locked prediction run; it does not trust a client-provided date.
2. Each authenticated member gets one submission per draw. It may contain 1–3 tens digits, 1–3 units digits, and 1–5 exact pairs.
3. Every edit creates a revision and payload SHA-256. A database uniqueness constraint prevents duplicate user/draw submissions.
4. The deadline is 14:00 Asia/Bangkok on the verified draw date (`07:00Z`). Server time is authoritative.
5. D1 triggers refuse insertions after the deadline and refuse changes/deletion of locked pick content.
6. Verified official results settle submissions idempotently. Settlement creates one result row and one private notification.

## Scoring and leaderboard

- Correct tens: `10 / number of tens selected`
- Correct units: `10 / number of units selected`
- Correct exact pair: `100 / number of exact pairs selected`
- Total points are the sum, rounded to two decimals.
- The main leaderboard uses average points per settled draw and requires five settled draws. Fewer draws remain provisional.
- Tie-breaks: eligibility, average points, settled draws, exact hits, earlier join date, public ID.
- Annual boards filter by target draw year. Annual awards remain empty until a qualifying member exists.

## Security and operations

- All writes verify platform identity and same-origin browser requests server-side.
- Mutations have durable per-user rate limits.
- Aggregate distributions are public before lock; individual picks become public only after lock.
- Feature flags: `COMMUNITY_ENABLED`, `COMMUNITY_SUBMISSIONS_ENABLED`, and `LEADERBOARD_ENABLED`. Set any to `false` for an immediate rollback without deleting data.
- Database migration `0006_broad_imperial_guard.sql` is additive. Existing official draws, predictions, analytics, audit, exports, and provider tables are unchanged.
- `COMMERCIAL DATA LICENSE — UNRESOLVED` remains enforced and ads remain disabled.
