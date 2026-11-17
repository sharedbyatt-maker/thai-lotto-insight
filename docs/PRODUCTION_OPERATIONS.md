# V3.2 production operations

## Invariants

- Draw dates are unique and all prize values are stored as text.
- Provider payloads are normalized to `LotteryDraw` before persistence.
- Locked prediction runs and picks are protected by SQLite triggers. Evaluation is stored separately.
- Backfill uses conflict-safe inserts and cannot replace a locked target run.
- Public data is marked stale when a scheduled draw is still missing at 21:00 Bangkok time. Update `lib/draw-calendar.ts` with formally announced date changes. Hourly probes retrieve unexpectedly shifted or late draws.
- Commercial monetization remains disabled until a verified commercial data-source state exists.

## Routine after a draw

1. Confirm the scheduled sync completed.
2. Check provider health and the latest data audit in `/admin`.
3. Download the full JSON backup.
4. Confirm the public status is `READY`, not `STALE DATA` or `SOURCE ERROR`.

## Recovery

Use the README's non-programmer recovery sequence. Restore is deliberately limited to an empty database, server-authorized, and explicit-confirmation requests. Never restore over the populated production database.

## Provider replacement

A replacement implements `LotteryDataProvider` and returns `LotteryDraw`. No provider-specific fields may be used outside its adapter. Run all provider normalization, importer integration, analytics leakage, prediction immutability, and database integration tests before activation.

The December 2026 and January 2027 overrides follow the [Thai government announcement](https://thainews.prd.go.th/thainews/news/view/2414807/?bid=1) and the [New Year draw announcement](https://www.antifakenewscenter.com/นโยบายรัฐบาล/ข่าวสาร/postpone-the-draw/).
