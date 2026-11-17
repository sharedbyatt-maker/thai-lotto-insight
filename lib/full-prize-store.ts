import{env}from"cloudflare:workers";
import {prizeCompleteness,type FullPrizeDraw,type PrizeCategory} from "./full-ticket-checker";
import {GLO_LATEST_API,GLO_RESOURCE_ID} from "./providers";

const db=()=>env.DB;
type Entry={category:PrizeCategory;number:string;position:number};
type PrizeEntryRow={category:string;winning_number:string;position_index:number};
type DrawDateRow={draw_date:string};
type BackfillRow={draw_date:string;status:string;attempts:number;last_error:string|null;completeness:string|null};
function resultRows<T>(value:unknown):T[]{if(!value||typeof value!=="object"||!("results" in value))return[];const results=(value as{results?:unknown}).results;return Array.isArray(results)?results as T[]:[]}
function entriesFromDraw(draw:FullPrizeDraw):Entry[]{const sources:Record<PrizeCategory,string[]>={FIRST_PRIZE:[draw.firstPrize],NEAR_FIRST_PRIZE:draw.nearFirst,FRONT_3:draw.front3,LAST_3:draw.last3,LAST_2:[draw.last2],SECOND_PRIZE:draw.secondPrize,THIRD_PRIZE:draw.thirdPrize,FOURTH_PRIZE:draw.fourthPrize,FIFTH_PRIZE:draw.fifthPrize};return Object.entries(sources).flatMap(([category,numbers])=>numbers.map((number,position)=>({category:category as PrizeCategory,number,position})))}

export async function persistFullPrizeDraw(draw: FullPrizeDraw, database = db()) {
  const now = new Date().toISOString();
  const completeness = prizeCompleteness(draw);
  const hasSummary = draw.front3.length === 2 && draw.last3.length === 2;
  const entries = JSON.stringify(entriesFromDraw(draw));
  const statements = [
    database.prepare(`
      INSERT INTO v3_full_prize_draws(draw_date,source_hash,completeness,source_name,source_url,verified_at,fetched_at,is_active,first_prize,last_2)
      SELECT ?,?,?,?,?,?,?,1,?,?
      WHERE (? = 'FULL_PRIZE_SET_VERIFIED' OR NOT EXISTS (
        SELECT 1 FROM v3_full_prize_draws d
        WHERE d.draw_date=? AND d.is_active=1 AND d.source_hash<>?
          AND d.completeness='FULL_PRIZE_SET_VERIFIED' AND 173 = (
            SELECT COUNT(*) FROM v3_full_prize_entries e
            WHERE e.draw_date=d.draw_date AND e.source_hash=d.source_hash
          )
      )) AND (? OR NOT EXISTS (
        SELECT 1 FROM v3_lottery_draws WHERE draw_date=?
          AND (first_prize<>? OR last_2<>?)
      ))
      ON CONFLICT(draw_date,source_hash) DO UPDATE SET completeness=excluded.completeness,
        source_name=excluded.source_name,source_url=excluded.source_url,verified_at=excluded.verified_at,
        fetched_at=excluded.fetched_at,is_active=1,first_prize=excluded.first_prize,last_2=excluded.last_2
      WHERE is_active<>1 OR completeness<>excluded.completeness
    `).bind(draw.drawDate,draw.sourceHash,completeness,draw.source,draw.sourceUrl,draw.verifiedAt,
      now,draw.firstPrize,draw.last2,completeness,draw.drawDate,draw.sourceHash,Number(hasSummary),draw.drawDate,draw.firstPrize,draw.last2),
    database.prepare(`
      INSERT OR IGNORE INTO v3_full_prize_entries(draw_date,source_hash,category,winning_number,position_index,created_at)
      SELECT ?,?,json_extract(value,'$.category'),json_extract(value,'$.number'),json_extract(value,'$.position'),?
      FROM json_each(?) WHERE EXISTS (
        SELECT 1 FROM v3_full_prize_draws WHERE draw_date=? AND source_hash=? AND is_active=1
      )
    `).bind(draw.drawDate,draw.sourceHash,now,entries,draw.drawDate,draw.sourceHash),
    database.prepare(`
      UPDATE v3_full_prize_draws SET is_active=0
      WHERE draw_date=? AND source_hash<>? AND is_active=1 AND EXISTS (
        SELECT 1 FROM v3_full_prize_draws WHERE draw_date=? AND source_hash=? AND is_active=1
      )
    `).bind(draw.drawDate,draw.sourceHash,draw.drawDate,draw.sourceHash),
  ];
  if (hasSummary) {
    statements.push(database.prepare(`
      INSERT INTO v3_lottery_draws(draw_date,first_prize,front_3_1,front_3_2,last_3_1,last_3_2,last_2,
        source_name,source_url,source_resource_id,source_timestamp,source_hash,verification_status,validation_status,created_at,updated_at)
      SELECT ?,?,?,?,?,?,?,?,?,?,?,?,'api_validated','valid',?,?
      WHERE EXISTS (SELECT 1 FROM v3_full_prize_draws WHERE draw_date=? AND source_hash=? AND is_active=1)
      ON CONFLICT(draw_date) DO UPDATE SET first_prize=excluded.first_prize,front_3_1=excluded.front_3_1,
        front_3_2=excluded.front_3_2,last_3_1=excluded.last_3_1,last_3_2=excluded.last_3_2,last_2=excluded.last_2,
        source_name=excluded.source_name,source_url=excluded.source_url,source_resource_id=excluded.source_resource_id,
        source_timestamp=excluded.source_timestamp,source_hash=excluded.source_hash,
        verification_status=excluded.verification_status,validation_status=excluded.validation_status,updated_at=excluded.updated_at
      WHERE v3_lottery_draws.source_hash IS NOT excluded.source_hash
         OR v3_lottery_draws.validation_status <> 'valid'
         OR v3_lottery_draws.first_prize <> excluded.first_prize OR v3_lottery_draws.last_2 <> excluded.last_2
         OR v3_lottery_draws.front_3_1 <> excluded.front_3_1 OR v3_lottery_draws.front_3_2 <> excluded.front_3_2
         OR v3_lottery_draws.last_3_1 <> excluded.last_3_1 OR v3_lottery_draws.last_3_2 <> excluded.last_3_2
    `).bind(draw.drawDate,draw.firstPrize,...draw.front3,...draw.last3,draw.last2,draw.source,draw.sourceUrl,
      draw.sourceUrl === GLO_LATEST_API ? "0846af20-af93-498c-91d9-644a885733f7" : GLO_RESOURCE_ID,draw.verifiedAt,draw.sourceHash,now,now,draw.drawDate,draw.sourceHash));
  }
  const summaryIndex = hasSummary ? statements.length - 1 : -1;
  if (hasSummary) {
    statements.push(database.prepare("DELETE FROM v3_analysis_snapshots WHERE changes()>0 AND data_cutoff>=?").bind(draw.drawDate));
  }
  // D1 commits the batch as one transaction, including on retries of older snapshots.
  const results = await database.batch<{meta?: {changes?: number}}>(statements);
  return {
    changed: results.some(result => (result.meta?.changes ?? 0) > 0),
    summaryChanged: hasSummary && (results[summaryIndex]?.meta?.changes ?? 0) > 0,
  };
}

export async function getPersistedFullDraw(drawDate:string):Promise<FullPrizeDraw|null>{const meta=await db().prepare("SELECT draw_date,source_hash,completeness,source_name,source_url,verified_at,first_prize,last_2 FROM v3_full_prize_draws WHERE draw_date=? AND is_active=1 ORDER BY id DESC LIMIT 1").bind(drawDate).first<{draw_date:string;source_hash:string;completeness:string;source_name:string;source_url:string;verified_at:string;first_prize:string;last_2:string}>();if(!meta)return null;const raw:unknown=await db().prepare("SELECT category,winning_number,position_index FROM v3_full_prize_entries WHERE draw_date=? AND source_hash=? ORDER BY category,position_index,id").bind(drawDate,meta.source_hash).all();const rows=resultRows<PrizeEntryRow>(raw),by=(category:PrizeCategory)=>rows.filter((r:PrizeEntryRow)=>r.category===category).sort((a:PrizeEntryRow,b:PrizeEntryRow)=>a.position_index-b.position_index).map((r:PrizeEntryRow)=>r.winning_number);const draw={drawDate:meta.draw_date,firstPrize:meta.first_prize,nearFirst:by("NEAR_FIRST_PRIZE"),front3:by("FRONT_3"),last3:by("LAST_3"),last2:meta.last_2,secondPrize:by("SECOND_PRIZE"),thirdPrize:by("THIRD_PRIZE"),fourthPrize:by("FOURTH_PRIZE"),fifthPrize:by("FIFTH_PRIZE"),source:meta.source_name,sourceUrl:meta.source_url,sourceHash:meta.source_hash,verifiedAt:meta.verified_at};return {...draw,completeness:prizeCompleteness(draw)}}

export async function getLatestPersistedFullDraw():Promise<FullPrizeDraw|null>{const row=await db().prepare("SELECT draw_date FROM v3_full_prize_draws WHERE is_active=1 ORDER BY draw_date DESC,id DESC LIMIT 1").first<DrawDateRow>();return row?getPersistedFullDraw(row.draw_date):null}

export async function seedFullPrizeBackfill():Promise<number>{const raw:unknown=await db().prepare("SELECT draw_date FROM v3_lottery_draws WHERE validation_status='valid' ORDER BY draw_date").all(),draws=resultRows<DrawDateRow>(raw),before=await db().prepare("SELECT COUNT(*) count FROM v3_full_prize_backfill").first<{count:number}>();for(const row of draws)await db().prepare("INSERT OR IGNORE INTO v3_full_prize_backfill(draw_date,status,attempts) VALUES(?,'pending',0)").bind(row.draw_date).run();const after=await db().prepare("SELECT COUNT(*) count FROM v3_full_prize_backfill").first<{count:number}>();return Math.max(0,Number(after?.count??0)-Number(before?.count??0))}

export async function nextBackfillDates(limit=5,maxAttempts=4):Promise<string[]>{const safe=Math.max(1,Math.min(20,Math.floor(limit)||5)),raw:unknown=await db().prepare("SELECT draw_date FROM v3_full_prize_backfill WHERE attempts<? AND status IN ('pending','failed') ORDER BY draw_date LIMIT ?").bind(maxAttempts,safe).all();return resultRows<DrawDateRow>(raw).map((r:DrawDateRow)=>r.draw_date)}

export async function markBackfillAttempt(drawDate:string,error?:unknown,draw?:FullPrizeDraw):Promise<void>{const now=new Date().toISOString();if(draw){await db().prepare("UPDATE v3_full_prize_backfill SET status='completed',attempts=attempts+1,last_error=NULL,last_attempt_at=?,completed_at=?,source_hash=?,completeness=? WHERE draw_date=?").bind(now,now,draw.sourceHash,draw.completeness,drawDate).run();return}const message=error instanceof Error?error.message:String(error??"Unknown backfill error");await db().prepare("UPDATE v3_full_prize_backfill SET status='failed',attempts=attempts+1,last_error=?,last_attempt_at=? WHERE draw_date=?").bind(message.slice(0,500),now,drawDate).run()}

export async function getFullPrizeBackfillStatus(){const raw:unknown=await db().prepare("SELECT draw_date,status,attempts,last_error,completeness FROM v3_full_prize_backfill ORDER BY draw_date").all(),items=resultRows<BackfillRow>(raw),counts:Record<string,number>={};let full=0,summary=0;for(const row of items){counts[row.status]=(counts[row.status]??0)+1;if(row.completeness==="FULL_PRIZE_SET_VERIFIED")full++;if(row.completeness==="SUMMARY_VERIFIED")summary++}return{total:items.length,counts,full,summary,recentFailures:items.filter((r:BackfillRow)=>r.status==="failed").slice(-10).map((r:BackfillRow)=>({drawDate:r.draw_date,attempts:r.attempts,lastError:r.last_error,completeness:r.completeness}))}}

export const FULL_PRIZE_STORE_TABLES={draws:"v3_full_prize_draws",entries:"v3_full_prize_entries",backfill:"v3_full_prize_backfill"}as const;
