import test from"node:test";import assert from"node:assert/strict";import{readFileSync}from"node:fs";
const archive=readFileSync(new URL("../app/results/page.tsx",import.meta.url),"utf8");
const detail=readFileSync(new URL("../components/draw-detail.tsx",import.meta.url),"utf8");
const status=readFileSync(new URL("../app/api/full-results/status/route.ts",import.meta.url),"utf8");
test("results archive distinguishes full-prize snapshots from summary-only draws",()=>{assert.match(archive,/full-results\/status/);assert.match(archive,/FULL_PRIZE_SET_VERIFIED/);assert.match(archive,/result-badge-full/);assert.match(archive,/result-badge-summary/)});
test("completeness endpoint is read-only and degrades safely before migration",()=>{assert.match(status,/SELECT draw_date,completeness/);assert.match(status,/is_active=1/);assert.match(status,/status:\"unavailable\"/);assert.doesNotMatch(status,/INSERT|UPDATE|DELETE|DROP|ALTER/i)});
test("draw detail has one authoritative prize presentation",()=>{assert.equal((detail.match(/<FullPrizePanel/g)??[]).length,1);assert.doesNotMatch(detail,/function Prize\(/);assert.match(detail,/check\?date=\$\{date\}/)});
