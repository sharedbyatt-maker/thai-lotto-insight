import { env } from "cloudflare:workers";
import {
  fetchOfficialFullDraw,
  type FullPrizeDraw,
} from "./full-ticket-checker";
import { persistFullPrizeDraw } from "./full-prize-store";
import { acquireJobLock, releaseJobLock } from "./operational-guards";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
export const IMMUTABLE_2026_09_16_TOP5=["87","06","58","83","61"] as const;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function bangkokDate(now = new Date()) {
  return new Date(now.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}
export function isDrawSyncDay(now = new Date()) {
  const day = Number(bangkokDate(now).slice(-2));
  // 2nd/17th cover officially shifted holiday draws. The returned official
  // date is still validated and unique constraints prevent duplicate writes.
  return day === 1 || day === 2 || day === 16 || day === 17;
}
export function isDrawSyncWindow(now = new Date()) {
  const bangkok = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  const hour = bangkok.getUTCHours();
  // Results are released during the afternoon. Polling only in this bounded
  // window keeps the public request path database-only while reducing the
  // delay between the final official publication and the stored result.
  return isDrawSyncDay(now) && hour >= 14 && hour <= 20;
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

async function persistSummary(draw: FullPrizeDraw) {
  const now = new Date().toISOString(),
    front = [...draw.front3, "", ""],
    last = [...draw.last3, "", ""];
  const result = (await env.DB.prepare(
    "INSERT INTO v3_lottery_draws(draw_date,first_prize,front_3_1,front_3_2,last_3_1,last_3_2,last_2,source_name,source_url,source_timestamp,source_hash,verification_status,validation_status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(draw_date) DO NOTHING",
  )
    .bind(
      draw.drawDate,
      draw.firstPrize,
      front[0],
      front[1],
      last[0],
      last[1],
      draw.last2,
      draw.source,
      draw.sourceUrl,
      draw.verifiedAt,
      draw.sourceHash,
      "api_validated",
      "valid",
      now,
      now,
    )
    .run()) as { meta?: { changes?: number } };
  return Number(result.meta?.changes ?? 0) > 0;
}

export async function runDrawDaySync(now = new Date(), force = false) {
  if (!force && !isDrawSyncWindow(now))
    return {
      status: "skipped",
      reason: "not_draw_window",
      date: bangkokDate(now),
    };
  const owner = await acquireJobLock("draw-day-sync", 20 * 60_000);
  if (!owner) return { status: "busy" };
  const startedAt = new Date().toISOString();
  try {
    const draw = await fetchWithBackoff(),
      latest = await env.DB.prepare(
        "SELECT draw_date,source_hash FROM v3_full_prize_draws WHERE is_active=1 ORDER BY draw_date DESC,id DESC LIMIT 1",
      ).first<{ draw_date: string; source_hash: string }>();
    if (
      latest?.draw_date === draw.drawDate &&
      latest.source_hash === draw.sourceHash
    )
      return {
        status: "duplicate",
        drawDate: draw.drawDate,
        verifiedAt: draw.verifiedAt,
      };
    await persistFullPrizeDraw(draw);
    const imported = await persistSummary(draw);
    await env.DB.prepare(
      "INSERT INTO v3_sync_runs(provider,status,started_at,completed_at,imported_count,invalid_count,duplicate_count,processed_count,error_message) VALUES(?,?,?,?,?,?,?,?,NULL)",
    )
      .bind(
        "Government Lottery Office (GLO)",
        "success",
        startedAt,
        new Date().toISOString(),
        imported ? 1 : 0,
        0,
        imported ? 0 : 1,
        1,
      )
      .run();
    return {
      status: imported ? "imported" : "updated",
      drawDate: draw.drawDate,
      verifiedAt: draw.verifiedAt,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Draw sync failed";
    await env.DB.prepare(
      "INSERT INTO v3_sync_runs(provider,status,started_at,completed_at,imported_count,invalid_count,duplicate_count,processed_count,error_message) VALUES(?,?,?,?,0,0,0,1,?)",
    )
      .bind(
        "Government Lottery Office (GLO)",
        "failed",
        startedAt,
        new Date().toISOString(),
        message.slice(0, 500),
      )
      .run();
    throw error;
  } finally {
    await releaseJobLock("draw-day-sync", owner);
  }
}
