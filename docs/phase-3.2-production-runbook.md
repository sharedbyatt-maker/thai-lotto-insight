# Phase 3.2 Production Deployment Runbook

Target release: `Phase 3.2D Community Analytics UI`

Current source baseline at creation: `427b01a0f02391eda35f20c04e8343e3c248a95d`

## Safety invariants

Do not change prediction logic during deployment.

Preserve:
- existing verified `v3_lottery_draws` history
- Champion engine
- experimental Challenger status (not promoted)
- locked model output for 2026-09-16
- Community/model independence
- commercial monetization disabled while the data-license status remains unresolved
- leading-zero lottery numbers as strings
- no fabricated GLO fallback results

## 1. Pre-deploy checks

1. Confirm GitHub `main` points to the intended release SHA.
2. Confirm CI is green: lint, typecheck, unit, integration, production build.
3. Confirm production backup/export is available before DB migration.
4. Confirm server environment still has the expected admin allowlist/auth configuration.
5. Do not run full-prize backfill before migration `0007` is applied.

## 2. Database migration

Apply exactly:

`drizzle/0007_full_prize_persistence.sql`

This migration is additive. It creates:
- `v3_full_prize_draws`
- `v3_full_prize_entries`
- `v3_full_prize_backfill`

After migration, verify the existing verified historical draw count is unchanged.

Expected safety condition:
- `v3_lottery_draws` is not rewritten or truncated.

## 3. Deploy application

Deploy the latest verified `main` source to the existing ChatGPT Site production project.

After deployment, verify `/api/build` reports:
- release: `Phase 3.2D Community Analytics UI`
- build SHA matching the deployed source
- new deployment version

If `/api/build` still reports an older release, stop. Do not run backfill against an unverified deployment.

## 4. Production smoke test

Check these routes on mobile and desktop:

- `/`
- `/check`
- `/results`
- one `/results/YYYY-MM-DD` page
- `/statistics`
- `/statistics/digit-frequency`
- `/backtest`
- `/2-digit`
- `/community`
- `/my-picks`
- `/leaderboard`
- `/champions`
- `/methodology`
- `/data-sources`

Verify:
- no horizontal overflow at ~320, 375, and 430 px widths
- language selector still works for EN/TH/MM
- navigation remains usable on mobile
- Model Score displays `/100`, not probability `%`
- `NO DEMONSTRATED ADVANTAGE` framing remains visible where applicable
- no fake community members or demo rankings appear

## 5. Ticket checker smoke test

Test `/check` with:
- valid 6-digit ticket
- leading-zero ticket, e.g. `004615`
- Thai digit input if supported
- invalid 5-digit input
- invalid 7-digit input
- letters
- latest draw
- historical draw

Verify:
- selected draw is preserved
- official source is shown
- verification completeness is clear
- all valid matched prize categories are shown
- no-match state is clear
- official-source failure does not fabricate a result

## 6. Initial full-prize persistence test

Open `/admin` after migration.

Expected admin status:
- `Full-prize persistence` no longer says `Migration pending`
- `Backfill next 5 draws` is enabled

Run only one bounded batch of 5 draws first.

Then verify:
- completed/failed counts update
- stored source hashes exist
- leading-zero prize values are preserved
- active snapshots are readable through the checker
- repeated execution is idempotent
- failures remain retryable and do not create fake data

Do not run all historical draws until the first batch is verified.

## 7. Gradual historical backfill

Continue in small bounded batches.

Monitor:
- completed count
- failed count
- retry attempts
- `FULL_PRIZE_SET_VERIFIED` count
- `SUMMARY_VERIFIED` count
- GLO provider health / source errors

Stop the backfill if repeated official-source failures occur.

## 8. Real authenticated Community E2E

Use one genuine signed-in account only.

Verify:
1. Sign in with ChatGPT.
2. Open `/my-picks`.
3. Submit Tens, Units, and Exact selections.
4. Include a leading-zero exact selection such as `04` or `07`.
5. Refresh and verify persistence.
6. Edit before deadline.
7. Verify duplicate user/draw protection.
8. Open the public community profile.
9. Verify provisional leaderboard behavior.
10. Sign out.
11. Verify authenticated writes are rejected after sign-out.
12. Verify anonymous writes are rejected.

Do not seed fake production members.

## 9. Final acceptance evidence

Record:
- GitHub source SHA
- CI result
- production build SHA
- deployment version
- migration applied: yes/no
- verified historical draw count before/after
- first backfill batch result
- full-prize coverage counts
- ticket checker smoke result
- Community auth E2E result
- EN/TH/MM visual QA result
- mobile/desktop QA result
- monetization guard status
- unresolved blockers

Phase 3.2 production is complete only when source, migration, deployment, checker, backfill, auth E2E, and visual QA are all verified.
