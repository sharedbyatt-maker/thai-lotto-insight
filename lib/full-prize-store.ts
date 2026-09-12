import {and,asc,eq,lt,or} from "drizzle-orm";
import {integer,sqliteTable,text,uniqueIndex,index} from "drizzle-orm/sqlite-core";
import {getDb} from "../db";
import {lotteryDraws} from "../db/schema";
import type {FullPrizeDraw,PrizeCategory} from "./full-ticket-checker";

const fullPrizeDraws=sqliteTable("v3_full_prize_draws",{
  id:integer("id").primaryKey({autoIncrement:true}),
  drawDate:text("draw_date").notNull(),
  sourceHash:text("source_hash").notNull(),
  completeness:text("completeness").notNull(),
  sourceName:text("source_name").notNull(),
  sourceUrl:text("source_url").notNull(),
  verifiedAt:text("verified_at").notNull(),
  fetchedAt:text("fetched_at").notNull(),
  isActive:integer("is_active",{mode:"boolean"}).notNull().default(true),
  firstPrize:text("first_prize").notNull(),
  last2:text("last_2").notNull(),
},t=>[
  uniqueIndex("ux_v3_full_prize_draw_hash").on(t.drawDate,t.sourceHash),
  index("idx_v3_full_prize_active_date").on(t.drawDate,t.isActive),
]);

const fullPrizeEntries=sqliteTable("v3_full_prize_entries",{
  id:integer("id").primaryKey({autoIncrement:true}),
  drawDate:text("draw_date").notNull(),
  sourceHash:text("source_hash").notNull(),
  category:text("category").notNull(),
  winningNumber:text("winning_number").notNull(),
  positionIndex:integer("position_index").notNull().default(0),
  createdAt:text("created_at").notNull(),
},t=>[
  uniqueIndex("ux_v3_full_prize_entry").on(t.drawDate,t.sourceHash,t.category,t.winningNumber),
  index("idx_v3_full_prize_entry_lookup").on(t.drawDate,t.sourceHash,t.category),
]);

const fullPrizeBackfill=sqliteTable("v3_full_prize_backfill",{
  id:integer("id").primaryKey({autoIncrement:true}),
  drawDate:text("draw_date").notNull(),
  status:text("status").notNull().default("pending"),
  attempts:integer("attempts").notNull().default(0),
  lastError:text("last_error"),
  lastAttemptAt:text("last_attempt_at"),
  completedAt:text("completed_at"),
  sourceHash:text("source_hash"),
  completeness:text("completeness"),
},t=>[
  uniqueIndex("ux_v3_full_prize_backfill_date").on(t.drawDate),
  index("idx_v3_full_prize_backfill_status").on(t.status,t.drawDate),
]);

type Entry={category:PrizeCategory;number:string;position:number};
const categories:PrizeCategory[]=["NEAR_FIRST_PRIZE","FRONT_3","LAST_3","SECOND_PRIZE","THIRD_PRIZE","FOURTH_PRIZE","FIFTH_PRIZE"];
function entriesFromDraw(draw:FullPrizeDraw):Entry[]{
  const sources:Record<PrizeCategory,string[]>={
    FIRST_PRIZE:[draw.firstPrize],NEAR_FIRST_PRIZE:draw.nearFirst,FRONT_3:draw.front3,LAST_3:draw.last3,LAST_2:[draw.last2],SECOND_PRIZE:draw.secondPrize,THIRD_PRIZE:draw.thirdPrize,FOURTH_PRIZE:draw.fourthPrize,FIFTH_PRIZE:draw.fifthPrize,
  };
  return Object.entries(sources).flatMap(([category,numbers])=>numbers.map((number,position)=>({category:category as PrizeCategory,number,position})));
}

export async function persistFullPrizeDraw(draw:FullPrizeDraw):Promise<void>{
  const db=getDb(),now=new Date().toISOString();
  await db.update(fullPrizeDraws).set({isActive:false}).where(and(eq(fullPrizeDraws.drawDate,draw.drawDate),eq(fullPrizeDraws.isActive,true)));
  await db.insert(fullPrizeDraws).values({drawDate:draw.drawDate,sourceHash:draw.sourceHash,completeness:draw.completeness,sourceName:draw.source,sourceUrl:draw.sourceUrl,verifiedAt:draw.verifiedAt,fetchedAt:now,isActive:true,firstPrize:draw.firstPrize,last2:draw.last2}).onConflictDoUpdate({target:[fullPrizeDraws.drawDate,fullPrizeDraws.sourceHash],set:{completeness:draw.completeness,sourceName:draw.source,sourceUrl:draw.sourceUrl,verifiedAt:draw.verifiedAt,fetchedAt:now,isActive:true,firstPrize:draw.firstPrize,last2:draw.last2}});
  const rows=entriesFromDraw(draw);
  for(const row of rows){
    await db.insert(fullPrizeEntries).values({drawDate:draw.drawDate,sourceHash:draw.sourceHash,category:row.category,winningNumber:row.number,positionIndex:row.position,createdAt:now}).onConflictDoNothing();
  }
}

export async function getPersistedFullDraw(drawDate:string):Promise<FullPrizeDraw|null>{
  const db=getDb();
  const meta=(await db.select().from(fullPrizeDraws).where(and(eq(fullPrizeDraws.drawDate,drawDate),eq(fullPrizeDraws.isActive,true))).limit(1))[0];
  if(!meta)return null;
  const rows=await db.select().from(fullPrizeEntries).where(and(eq(fullPrizeEntries.drawDate,drawDate),eq(fullPrizeEntries.sourceHash,meta.sourceHash))).orderBy(asc(fullPrizeEntries.positionIndex));
  const by=(category:PrizeCategory)=>rows.filter(r=>r.category===category).map(r=>r.winningNumber);
  return{drawDate:meta.drawDate,firstPrize:meta.firstPrize,nearFirst:by("NEAR_FIRST_PRIZE"),front3:by("FRONT_3"),last3:by("LAST_3"),last2:meta.last2,secondPrize:by("SECOND_PRIZE"),thirdPrize:by("THIRD_PRIZE"),fourthPrize:by("FOURTH_PRIZE"),fifthPrize:by("FIFTH_PRIZE"),source:meta.sourceName,sourceUrl:meta.sourceUrl,sourceHash:meta.sourceHash,verifiedAt:meta.verifiedAt,completeness:meta.completeness as FullPrizeDraw["completeness"]};
}

export async function seedFullPrizeBackfill():Promise<number>{
  const db=getDb(),draws=await db.select({drawDate:lotteryDraws.drawDate}).from(lotteryDraws).orderBy(asc(lotteryDraws.drawDate));
  let seeded=0;
  for(const draw of draws){
    const result=await db.insert(fullPrizeBackfill).values({drawDate:draw.drawDate,status:"pending",attempts:0}).onConflictDoNothing().returning({id:fullPrizeBackfill.id});
    if(result.length)seeded++;
  }
  return seeded;
}

export async function nextBackfillDates(limit=5,maxAttempts=4):Promise<string[]>{
  const db=getDb(),safe=Math.max(1,Math.min(20,Math.floor(limit)||5));
  const rows=await db.select({drawDate:fullPrizeBackfill.drawDate}).from(fullPrizeBackfill).where(and(lt(fullPrizeBackfill.attempts,maxAttempts),or(eq(fullPrizeBackfill.status,"pending"),eq(fullPrizeBackfill.status,"failed")))).orderBy(asc(fullPrizeBackfill.drawDate)).limit(safe);
  return rows.map(r=>r.drawDate);
}

export async function markBackfillAttempt(drawDate:string,error?:unknown,draw?:FullPrizeDraw):Promise<void>{
  const db=getDb(),now=new Date().toISOString();
  const current=(await db.select({attempts:fullPrizeBackfill.attempts}).from(fullPrizeBackfill).where(eq(fullPrizeBackfill.drawDate,drawDate)).limit(1))[0];
  const attempts=(current?.attempts??0)+1;
  if(draw){
    await db.update(fullPrizeBackfill).set({status:"completed",attempts,lastError:null,lastAttemptAt:now,completedAt:now,sourceHash:draw.sourceHash,completeness:draw.completeness}).where(eq(fullPrizeBackfill.drawDate,drawDate));
  }else{
    const message=error instanceof Error?error.message:String(error??"Unknown backfill error");
    await db.update(fullPrizeBackfill).set({status:"failed",attempts,lastError:message.slice(0,500),lastAttemptAt:now}).where(eq(fullPrizeBackfill.drawDate,drawDate));
  }
}

export async function getFullPrizeBackfillStatus(){
  const db=getDb(),rows=await db.select({status:fullPrizeBackfill.status,drawDate:fullPrizeBackfill.drawDate,attempts:fullPrizeBackfill.attempts,lastError:fullPrizeBackfill.lastError,completeness:fullPrizeBackfill.completeness}).from(fullPrizeBackfill).orderBy(asc(fullPrizeBackfill.drawDate));
  const counts=rows.reduce<Record<string,number>>((acc,row)=>(acc[row.status]=(acc[row.status]??0)+1,acc),{});
  return{total:rows.length,counts,recentFailures:rows.filter(r=>r.status==="failed").slice(-10)};
}

export const FULL_PRIZE_STORE_TABLES={draws:"v3_full_prize_draws",entries:"v3_full_prize_entries",backfill:"v3_full_prize_backfill"} as const;
