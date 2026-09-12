import {and,asc,eq,inArray,lt,or,sql} from "drizzle-orm";
import {getDb} from "../db";
import {importQueue,lotteryDraws,providerHealthEvents,rejectedDraws,syncRuns,systemEvents} from "../db/schema";
import {GLO_DATE_API,GLO_LATEST_API,GLOProvider,LotteryDataProvider,ProviderPayloadError,ProviderRequestError,ProviderResult} from "./providers";
import {ImportPersistence,processImportCandidate} from "./import-core";
import {settleCommunityDraws} from "./community-db";

export const HISTORICAL_START_DATE="2017-12-30";
export const MINIMUM_ANALYSIS_DRAWS=100;
export const DATA_LICENSE_STATUS="COMMERCIAL DATA LICENSE — UNRESOLVED";

type Candidate={candidateDate:string;slotDate:string};
const date=(y:number,m:number,d:number)=>new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10);
const EXCEPTION_DRAWS:Record<string,string>={"2018-01-01":"2017-12-30","2018-03-01":"2018-03-02","2019-07-16":"2019-07-15","2022-02-16":"2022-02-17","2023-08-01":"2023-07-31"};
const CANCELLED_SLOTS=["2020-04-16","2020-05-01","2020-05-16"];

// GLO normally draws on the 1st and 16th. Only tightly scoped, recurring holiday
// alternatives are queued: New Year (30 Dec/2 Jan), mid-January (17 Jan), and
// Labour/Coronation period (2 May). The API response date must equal the request.
export function historicalCandidates(start=HISTORICAL_START_DATE,end=new Date().toISOString().slice(0,10)):Candidate[]{
  const from=new Date(start+"T00:00:00Z"),to=new Date(end+"T23:59:59Z"),out=new Map<string,Candidate>();
  for(let y=from.getUTCFullYear();y<=to.getUTCFullYear();y++)for(let m=1;m<=12;m++)for(const day of [1,16]){
    const slot=date(y,m,day);if(slot<start||slot>end||CANCELLED_SLOTS.includes(slot))continue;
    const candidates=EXCEPTION_DRAWS[slot]?[EXCEPTION_DRAWS[slot]]:[slot];
    if(m===1&&day===1)candidates.push(date(y-1,12,30),date(y,1,2));
    if(m===1&&day===16)candidates.push(date(y,1,17));
    if(m===5&&day===1)candidates.push(date(y,5,2));
    for(const candidateDate of candidates)if(candidateDate>=start&&candidateDate<=end)out.set(candidateDate,{candidateDate,slotDate:slot});
  }
  return [...out.values()].sort((a,b)=>a.candidateDate.localeCompare(b.candidateDate));
}

export async function seedHistoricalQueue(){
  const db=getDb(),rows=historicalCandidates();
  for(let i=0;i<rows.length;i+=20)await db.insert(importQueue).values(rows.slice(i,i+20)).onConflictDoNothing({target:importQueue.candidateDate});
  for(const slotDate of CANCELLED_SLOTS)await db.update(importQueue).set({status:"cancelled",lastError:"No draw scheduled during the 2020 suspension period",completedAt:new Date().toISOString()}).where(eq(importQueue.slotDate,slotDate));
  return rows.length;
}

async function fetchWithHealth(provider:LotteryDataProvider,requestType:"date"|"latest",operation:()=>Promise<ProviderResult>){
  const db=getDb(),started=Date.now(),endpoint=requestType==="date"?GLO_DATE_API:GLO_LATEST_API;
  try{const result=await operation();await db.insert(providerHealthEvents).values({provider:provider.name,endpoint,requestType,success:true,validationFailure:false,latencyMs:Date.now()-started,httpStatus:200,errorMessage:null,createdAt:new Date().toISOString()});return result}
  catch(error){await db.insert(providerHealthEvents).values({provider:provider.name,endpoint,requestType,success:false,validationFailure:error instanceof ProviderPayloadError,latencyMs:Date.now()-started,httpStatus:error instanceof ProviderRequestError?error.httpStatus:null,errorMessage:error instanceof Error?error.message:"Provider request failed",createdAt:new Date().toISOString()});throw error}
}

export async function importHistoricalBatch(limit=12,provider:LotteryDataProvider=new GLOProvider()){
  const db=getDb(),startedAt=new Date().toISOString();
  await seedHistoricalQueue();
  const [run]=await db.insert(syncRuns).values({provider:provider.name,status:"running",startedAt,importedCount:0,invalidCount:0,duplicateCount:0,processedCount:0}).returning();
  const rows=await db.select().from(importQueue).where(or(eq(importQueue.status,"pending"),and(eq(importQueue.status,"retry"),lt(importQueue.attempts,3)))).orderBy(asc(importQueue.candidateDate)).limit(Math.max(1,Math.min(limit,20)));
  let imported=0,invalid=0,duplicates=0,noResult=0,failures=0;
  const store:ImportPersistence={insertDraw:async(draw,now)=>(await db.insert(lotteryDraws).values({...draw,validationStatus:"valid",createdAt:now,updatedAt:now}).onConflictDoNothing({target:lotteryDraws.drawDate}).returning({id:lotteryDraws.id})).length>0,insertRejected:async input=>{await db.insert(rejectedDraws).values(input)},updateCandidate:async(id,update)=>{await db.update(importQueue).set(update).where(eq(importQueue.id,id))}};
  for(const row of rows){
    const attemptedAt=new Date().toISOString();
    const outcome=await processImportCandidate({row,fetch:()=>fetchWithHealth(provider,"date",()=>provider.fetchByDate(row.candidateDate)),store,providerName:provider.name,sourceUrl:GLO_DATE_API,now:attemptedAt});
    if(outcome==="imported")imported++;else if(outcome==="duplicate")duplicates++;else if(outcome==="rejected")invalid++;else if(outcome==="no_result")noResult++;else failures++;
  }
  if(rows.length===0){
    try{
      const {draw}=await fetchWithHealth(provider,"latest",()=>provider.fetchLatest());
      const exists=(await db.select({id:lotteryDraws.id}).from(lotteryDraws).where(eq(lotteryDraws.drawDate,draw.drawDate)).limit(1))[0];
      if(!exists&&draw.drawDate<=new Date().toISOString().slice(0,10)){
        const savedAt=new Date().toISOString();
        const inserted=await db.insert(lotteryDraws).values({...draw,validationStatus:"valid",createdAt:savedAt,updatedAt:savedAt}).onConflictDoNothing({target:lotteryDraws.drawDate}).returning({id:lotteryDraws.id});
        if(inserted.length)imported++;
      }
    }catch{failures++}
  }
  const remaining=(await db.select({count:sql<number>`count(*)`}).from(importQueue).where(inArray(importQueue.status,["pending","retry"])))[0]?.count??0;
  const status=failures&&imported===0&&duplicates===0?"failed":remaining?"partial":"success",completedAt=new Date().toISOString();
  await db.update(syncRuns).set({status,completedAt,importedCount:imported,invalidCount:invalid,duplicateCount:duplicates,processedCount:rows.length,errorMessage:failures?`${failures} transient request failure(s)`:null}).where(eq(syncRuns.id,run.id));
  await db.insert(systemEvents).values({level:status==="failed"?"error":"info",eventType:"historical_import",message:`Historical batch: ${imported} imported, ${duplicates} duplicate, ${invalid} rejected, ${noResult} no-result`,metadata:JSON.stringify({runId:run.id,remaining,failures}),createdAt:completedAt});
  const community=await settleCommunityDraws();
  return{runId:run.id,status,processed:rows.length,imported,duplicates,rejected:invalid,noResult,failures,remaining,startedAt,completedAt,community};
}
