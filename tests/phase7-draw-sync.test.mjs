import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
test("public ticket and full-result requests are database-only", () => {
  for (const file of [
    "app/api/check/route.ts",
    "app/api/full-results/[date]/route.ts",
  ]) {
    const source = read(file);
    assert.match(source, /getStoredFullDraw/);
    assert.doesNotMatch(
      source,
      /fetchOfficialFullDraw|fetchVerifiedFullDraw|GLO_LATEST_API|GLO_DATE_API/,
    );
  }
});
test("stored draw reader has no network fallback", () => {
  const source = read("lib/full-ticket-checker.ts"),
    start = source.indexOf("export async function getStoredFullDraw");
  assert.ok(start > 0);
  assert.doesNotMatch(source.slice(start), /fetchOfficialFullDraw|fetch\(/);
});
test("scheduled sync is draw-window gated, retries exponentially, and deduplicates", () => {
  const source = read("lib/draw-day-sync.ts");
  assert.match(source, /day\s*===\s*1\s*\|\|\s*day\s*===\s*2\s*\|\|\s*day\s*===\s*16\s*\|\|\s*day\s*===\s*17/);
  assert.match(source, /hour\s*>=\s*14\s*&&\s*hour\s*<=\s*20/);
  assert.match(source, /500\s*\*\s*2\s*\*\*/);
  assert.match(source, /status:\s*\"duplicate\"/);
  assert.match(source, /ON CONFLICT\(draw_date\) DO NOTHING/);
  assert.match(read("worker/index.ts"), /scheduled/);
  assert.match(read("vite.config.ts"), /\*\/5 \* \* \* \*/);
  assert.match(read("worker/index.ts"), /draw-day-sync failed/);
});
test("public metadata names the cutoff and last verified storage time", () => {
  const source = read("lib/i18n.ts");
  assert.match(source, /ဘယ်အကြိမ်အထိ ပါသလဲ/);
  assert.match(source, /နောက်ဆုံးအတည်ပြုသိမ်းထားချိန်/);
  assert.match(read("components/public-shell.tsx"), /lastSuccessfulSync/);
});
test("immutable prediction remains exactly 87 06 58 83 61", () => {const source=read("lib/draw-day-sync.ts");assert.match(source,/IMMUTABLE_2026_09_16_TOP5=\["87","06","58","83","61"\]/);assert.doesNotMatch(source,/(UPDATE|DELETE FROM|INSERT INTO)\s+v3_predictions/i)});
