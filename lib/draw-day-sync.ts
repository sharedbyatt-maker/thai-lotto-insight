import { env } from "cloudflare:workers";
import { bangkokClock, bangkokDate, isExpectedDrawDate } from "./draw-calendar";
import { fetchOfficialFullDraw } from "./full-ticket-checker";
import { persistFullPrizeDraw } from "./full-prize-store";
import { acquireJobLock, releaseJobLock } from "./operational-guards";

export const IMMUTABLE_2026_09_16_TOP5=["87","06","58","83","61"] as const;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function isDrawSyncWindow(now = new Date()) {
  const bangkok = bangkokClock(now);
  const hour = bangkok.getUTCHours();
  // Poll expected draws every five minutes. Hourly probes catch previously
  // unannounced shifts, late publication, and interruptions after the window.
  return bangkok.getUTCMinutes() === 0 ||
    (hour >= 14 && hour <= 20 && isExpectedDrawDate(bangkokDate(now)));
}

export function retryDelayMs(attempt: number) {
  return Math.min(8000, 500 * 2 ** Math.max(0, attempt - 1));
}

async function fetchWithBackoff(attempts = 4) {
  let last: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetchOfficialFullDraw();
    } catch (error) {
      last = error;
      if (attempt < attempts) await sleep(retryDelayMs(attempt));
    }
  }
  throw last;
}

export async function runDrawDaySync(now = new Date(), force = false) {
  const date = bangkokDate(now);
  if (!force && !isDrawSyncWindow(now)) return {status: "skipped", reason: "not_draw_window", date};
  const owner = await acquireJobLock("draw-day-sync", 20 * 60_000);
  if (!owner) return {status: "busy"};
  const startedAt = new Date().toISOString();
  try {
    const draw = await fetchWithBackoff();
    if (draw.drawDate > date) throw new Error("GLO returned a future draw date");
    const saved = await persistFullPrizeDraw(draw);
    if (!saved.changed) return {status: "duplicate", drawDate: draw.drawDate, verifiedAt: draw.verifiedAt};
    await env.DB.prepare(
      "INSERT INTO v3_sync_runs(provider,status,started_at,completed_at,imported_count,invalid_count,duplicate_count,processed_count,error_message) VALUES(?,?,?,?,?,?,?,?,NULL)",
    ).bind(draw.source,"success",startedAt,new Date().toISOString(),saved.summaryChanged ? 1 : 0,0,0,1).run();
    return {status: saved.summaryChanged ? "imported" : "updated",drawDate: draw.drawDate,verifiedAt: draw.verifiedAt};
  } catch (error) {
    const message = error instanceof Error ? error.message : "Draw sync failed";
    await env.DB.prepare(
      "INSERT INTO v3_sync_runs(provider,status,started_at,completed_at,imported_count,invalid_count,duplicate_count,processed_count,error_message) VALUES(?,?,?,?,0,0,0,1,?)",
    ).bind("Government Lottery Office (GLO)","failed",startedAt,new Date().toISOString(),message.slice(0,500)).run();
    throw error;
  } finally {
    await releaseJobLock("draw-day-sync", owner);
  }
}
