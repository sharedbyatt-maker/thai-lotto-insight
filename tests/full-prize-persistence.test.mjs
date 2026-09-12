import test from"node:test";import assert from"node:assert/strict";import{readFileSync}from"node:fs";
const migration=readFileSync(new URL("../drizzle/0007_full_prize_persistence.sql",import.meta.url),"utf8");
const store=readFileSync(new URL("../lib/full-prize-store.ts",import.meta.url),"utf8");
const checker=readFileSync(new URL("../lib/full-ticket-checker.ts",import.meta.url),"utf8");
const route=readFileSync(new URL("../app/api/admin/full-prize-backfill/route.ts",import.meta.url),"utf8");

test("full-prize migration is additive and normalized",()=>{assert.match(migration,/CREATE TABLE `v3_full_prize_draws`/);assert.match(migration,/CREATE TABLE `v3_full_prize_entries`/);assert.match(migration,/CREATE TABLE `v3_full_prize_backfill`/);assert.match(migration,/`source_hash` text NOT NULL/);assert.match(migration,/`winning_number` text NOT NULL/);assert.doesNotMatch(migration,/ALTER TABLE `v3_lottery_draws`|DROP TABLE|DELETE FROM `v3_lottery_draws`/)});

test("persisted prize snapshots are versioned by source hash",()=>{assert.match(store,/ON CONFLICT\(draw_date,source_hash\)/);assert.match(store,/WHERE draw_date=\? AND source_hash=\?/);assert.match(store,/SET is_active=0/);assert.match(store,/INSERT OR IGNORE INTO v3_full_prize_entries/)});

test("historical checker uses persistent verified data before official fetch",()=>{const cache=checker.indexOf("getPersistedFullDraw");const fetch=checker.indexOf("fetchOfficialFullDraw(normalized)");assert.ok(cache>=0&&fetch>cache);assert.match(checker,/Fall through to verified official source/);assert.match(checker,/Storage may not be migrated yet/)});

test("backfill control is admin protected and bounded",()=>{assert.match(route,/requireAdminApi/);assert.match(route,/runFullPrizeBackfill/);const worker=readFileSync(new URL("../lib/full-prize-backfill.ts",import.meta.url),"utf8");assert.match(worker,/Math\.min\(10/);assert.match(worker,/fetchOfficialFullDraw/);assert.match(worker,/persistFullPrizeDraw/);assert.match(worker,/markBackfillAttempt/)});
