import {desc,eq,gt,sql} from "drizzle-orm";
import {getDb} from "../../../db";
import {backtestRuns,engineVersions,importQueue,lotteryDraws,mlRuns,optimizerRuns,predictionResults,predictionRuns,predictions,rejectedDraws,sourceVerifications,syncRuns} from "../../../db/schema";
import {analyzeNumbers,DEFAULT_WEIGHTS,MIN_HISTORY} from "../../../lib/analytics";
import {DATA_LICENSE_STATUS} from "../../../lib/importer";
import {GLO_CATALOG_URL,GLO_RESOURCE_ID} from "../../../lib/providers";

export const dynamic="force-dynamic";
export async function GET(){try{
  const db=getDb(),draws=await db.select().from(lotteryDraws).where(eq(lotteryDraws.validationStatus,"valid")).orderBy(lotteryDraws.drawDate),latest=draws.at(-1)??null;
  const rejected=(await db.select({count:sql<number>`count(*)`}).from(rejectedDraws))[0]?.count??0;
  const queue=await db.select().from(importQueue),slotMap=new Map<string,boolean>();
  for(const q of queue)slotMap.set(q.slotDate,(slotMap.get(q.slotDate)??false)||q.status==="imported"||q.status==="duplicate"||q.status==="cancelled");
  const missingExpectedDrawDates=[...slotMap.entries()].filter(([,found])=>!found).map(([slot])=>slot),missingExpectedDraws=missingExpectedDrawDates.length;
  const duplicateAttempts=(await db.select({count:sql<number>`coalesce(sum(${syncRuns.duplicateCount}),0)`}).from(syncRuns))[0]?.count??0;
  const engine=(await db.select().from(engineVersions).where(eq(engineVersions.active,true)).limit(1))[0]??null;
  const lastSync=(await db.select().from(syncRuns).orderBy(desc(syncRuns.id)).limit(1))[0]??null;
  const lastSuccessfulImport=(await db.select().from(syncRuns).where(gt(syncRuns.importedCount,0)).orderBy(desc(syncRuns.id)).limit(1))[0]??null;
  const backtest=(await db.select().from(backtestRuns).orderBy(desc(backtestRuns.id)).limit(1))[0]??null;
  const optimizer=(await db.select().from(optimizerRuns).orderBy(desc(optimizerRuns.id)).limit(1))[0]??null,ml=(await db.select().from(mlRuns).orderBy(desc(mlRuns.id)).limit(1))[0]??null;
  const verificationSamples=await db.select().from(sourceVerifications).orderBy(sourceVerifications.drawDate);
  const run=(await db.select().from(predictionRuns).orderBy(desc(predictionRuns.id)).limit(1))[0]??null;
  let picks:any[]=[];if(run)picks=await db.select().from(predictions).where(eq(predictions.runId,run.id)).orderBy(predictions.rank).limit(10);
  const history=await db.select().from(predictionResults).orderBy(desc(predictionResults.id)).limit(20);
  const enough=draws.length>=MIN_HISTORY,stats=enough?analyzeNumbers(draws.map(d=>({drawDate:d.drawDate,last2:d.last2}))):[];
  const ageDays=latest?Math.floor((Date.now()-new Date(latest.drawDate+"T00:00:00Z").getTime())/86400000):null;
  const status=lastSync?.status==="failed"&&!latest?"source_error":!draws.length?"sync_pending":!enough?"insufficient_data":ageDays!==null&&ageDays>25?"stale_data":"ready";
  return Response.json({status,statusLabel:status.toUpperCase().replaceAll("_"," "),latest,drawCount:draws.length,rejectedDrawCount:rejected,earliest:draws[0]?.drawDate??null,latestDate:latest?.drawDate??null,missingExpectedDraws,missingExpectedDrawDates,duplicateAttemptsPrevented:duplicateAttempts,lastSuccessfulImport,lastSync,activeSource:{name:"Government Lottery Office (GLO)",catalogUrl:GLO_CATALOG_URL,resourceId:GLO_RESOURCE_ID},licenseStatus:DATA_LICENSE_STATUS,minimumSampleThreshold:MIN_HISTORY,statisticalSampleSize:enough?draws.length:0,verificationSamples,statistics:stats,hotDigits:enough?digitStats(draws.map(d=>d.last2)):[],engine:engine??{version:null,parameters:JSON.stringify(DEFAULT_WEIGHTS),active:false},latestRun:run,picks,history,backtest,optimizer,ml,generatedAt:new Date().toISOString()},{headers:{"Cache-Control":"public, max-age=60, stale-while-revalidate=300"}});
}catch(e){return Response.json({status:"source_error",statusLabel:"SOURCE ERROR",message:"Historical data source or database is unavailable",detail:e instanceof Error?e.message:"Database unavailable"},{status:503})}}
function digitStats(v:string[]){return Array.from({length:10},(_,n)=>({digit:String(n),count:v.reduce((c,x)=>c+(x[0]===String(n)?1:0)+(x[1]===String(n)?1:0),0)})).sort((a,b)=>b.count-a.count)}
