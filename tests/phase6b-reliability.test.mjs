import test from"node:test";
import assert from"node:assert/strict";
import{readFileSync}from"node:fs";
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
test("public pages use bounded purpose-specific endpoints",()=>{assert.match(read("app/page.tsx"),/\/api\/home/);assert.match(read("app\/2-digit\/page.tsx"),/\/api\/prediction-center/);assert.doesNotMatch(read("app/page.tsx"),/\/api\/dashboard/)});
test("analysis is persisted by cutoff instead of recomputed on every request",()=>{const source=read("lib/analysis-snapshot.ts");assert.match(source,/v3_analysis_snapshots/);assert.match(source,/data_cutoff/);assert.match(read("app/api/dashboard/route.ts"),/getAnalysisSnapshot/)});
test("latest ticket checks are database-only and anonymous checks are rate limited",()=>{assert.match(read("lib/full-ticket-checker.ts"),/getLatestPersistedFullDraw/);assert.match(read("app/api/check/route.ts"),/getStoredFullDraw/);assert.doesNotMatch(read("app/api/check/route.ts"),/fetchOfficial/);assert.match(read("app/api/check/route.ts"),/consumeRateLimit/);assert.match(read("app/api/check/route.ts"),/Retry-After/)});
test("sync and analysis jobs reject overlapping execution",()=>{for(const path of["app/api/admin/sync/route.ts","app/api/admin/analyze/route.ts"]){const source=read(path);assert.match(source,/acquireJobLock/);assert.match(source,/releaseJobLock/);assert.match(source,/status:409/)}});
test("Phase 6B migration is additive and never touches prediction records",()=>{const sql=read("drizzle/0008_lowly_puppet_master.sql");assert.match(sql,/CREATE TABLE `v3_analysis_snapshots`/);assert.match(sql,/CREATE TABLE `v3_api_rate_limits`/);assert.match(sql,/CREATE TABLE `v3_job_locks`/);assert.doesNotMatch(sql,/(UPDATE|DELETE FROM|DROP TABLE).*v3_predictions/i)});
