import {desc,eq,gt,sql} from "drizzle-orm";
import {getDb} from "../../../db";
import {backtestRuns,dataAuditRuns,engineVersions,importQueue,lotteryDraws,mlRuns,optimizerRuns,predictionResults,predictionRuns,predictions,providerHealthEvents,rejectedDraws,sourceVerifications,syncRuns} from "../../../db/schema";
import {analyzeNumbers,DEFAULT_WEIGHTS,MIN_HISTORY} from "../../../lib/analytics";
import {DATA_LICENSE_STATUS} from "../../../lib/importer";
import {GLO_CATALOG_URL,GLO_RESOURCE_ID} from "../../../lib/providers";
import {publicDataMetadata} from "../../../lib/freshness";
import {commercialMonetizationGuard} from "../../../lib/commercial";
import {getAnalysisSnapshot} from "../../../lib/analysis-snapshot";

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
  const lastSuccessfulSync=(await db.select().from(syncRuns).where(eq(syncRuns.status,"success")).orderBy(desc(syncRuns.id)).limit(1))[0]??null;
  const backtest=(await db.select().from(backtestRuns).orderBy(desc(backtestRuns.id)).limit(1))[0]??null;
  const optimizer=(await db.select().from(optimizerRuns).orderBy(desc(optimizerRuns.id)).limit(1))[0]??null,ml=(await db.select().from(mlRuns).orderBy(desc(mlRuns.id)).limit(1))[0]??null;
  const verificationSamples=await db.select().from(sourceVerifications).orderBy(sourceVerifications.drawDate);
  const healthRows=await db.select().from(providerHealthEvents).orderBy(desc(providerHealthEvents.id)).limit(100),healthSuccesses=healthRows.filter(x=>x.success),healthFailures=healthRows.filter(x=>!x.success),consecutiveFailures=healthRows.findIndex(x=>x.success)===-1?healthRows.length:healthRows.findIndex(x=>x.success);
  const providerHealth={sampleSize:healthRows.length,requestSuccessRate:healthRows.length?100*healthSuccesses.length/healthRows.length:null,lastSuccess:healthSuccesses[0]?.createdAt??null,lastFailure:healthFailures[0]?.createdAt??null,responseValidationFailures:healthRows.filter(x=>x.validationFailure).length,averageLatencyMs:healthRows.length?healthRows.reduce((n,x)=>n+x.latencyMs,0)/healthRows.length:null,consecutiveFailures,status:consecutiveFailures>=3?"unhealthy":consecutiveFailures?"degraded":healthRows.length?"healthy":"unobserved"};
  const latestAudit=(await db.select().from(dataAuditRuns).orderBy(desc(dataAuditRuns.id)).limit(1))[0]??null;
  const run=(await db.select().from(predictionRuns).orderBy(desc(predictionRuns.id)).limit(1))[0]??null;
  let picks:any[]=[],lockedEngine=null;if(run){picks=await db.select().from(predictions).where(eq(predictions.runId,run.id)).orderBy(predictions.rank).limit(10);lockedEngine=(await db.select().from(engineVersions).where(eq(engineVersions.id,run.engineVersionId)).limit(1))[0]??null}
  const lockedPrediction=run?{run,engine:lockedEngine,picks:picks.map(p=>({...p,components:safeObject(p.componentScores)}))}:null;
  const history=await db.select().from(predictionResults).orderBy(desc(predictionResults.id)).limit(20);
  const enough=draws.length>=MIN_HISTORY,digitDraws=draws.map(d=>({drawDate:d.drawDate,last2:d.last2,firstPrize:d.firstPrize})),stats=enough?analyzeNumbers(digitDraws):[],snapshot=enough?await getAnalysisSnapshot(digitDraws,run?.drawDate):null,digitCandidate=snapshot?.digitCandidate??null,digitFirst=snapshot?.digitFirst??null,patternLab=snapshot?.patternLab??null;
  const dataMeta=publicDataMetadata({dataCutoff:latest?.drawDate??null,lastSuccessfulSync:lastSuccessfulSync?.completedAt??null});
  const status=!draws.length?(lastSync?.status==="failed"?"source_error":"sync_pending"):!enough?"insufficient_data":providerHealth.status==="unhealthy"?"source_error":dataMeta.freshness.isStale?"stale_data":"ready";
  return Response.json({status,statusLabel:status.toUpperCase().replaceAll("_"," "),latest,drawCount:draws.length,rejectedDrawCount:rejected,earliest:draws[0]?.drawDate??null,latestDate:latest?.drawDate??null,missingExpectedDraws,missingExpectedDrawDates,duplicateAttemptsPrevented:duplicateAttempts,lastSuccessfulImport,lastSuccessfulSync,lastSync,dataMeta,providerHealth,latestAudit,commercialMonetization:commercialMonetizationGuard(),activeSource:{name:"Government Lottery Office (GLO)",catalogUrl:GLO_CATALOG_URL,resourceId:GLO_RESOURCE_ID},licenseStatus:DATA_LICENSE_STATUS,minimumSampleThreshold:MIN_HISTORY,statisticalSampleSize:enough?draws.length:0,verificationSamples,statistics:stats,hotDigits:enough?digitStats(draws.map(d=>d.last2)):[],engine:engine??{version:null,parameters:JSON.stringify(DEFAULT_WEIGHTS),active:false},latestRun:run,picks,lockedPrediction,history,backtest,backtestReport:backtest?JSON.parse(backtest.splitMetadata):null,optimizer,ml,digitFirst,digitCandidate,patternLab,generatedAt:new Date().toISOString()},{headers:{"Cache-Control":"public, max-age=60, stale-while-revalidate=300"}});
}catch{return Response.json({status:"source_error",statusLabel:"SOURCE ERROR",message:"Historical data source or database is unavailable"},{status:503,headers:{"cache-control":"no-store"}})}}
function digitStats(v:string[]){return Array.from({length:10},(_,n)=>({digit:String(n),count:v.reduce((c,x)=>c+(x[0]===String(n)?1:0)+(x[1]===String(n)?1:0),0)})).sort((a,b)=>b.count-a.count)}
function safeObject(value:string){try{const parsed=JSON.parse(value);return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed:{}}catch{return{}}}
