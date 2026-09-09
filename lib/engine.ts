import {and,desc,eq,sql} from "drizzle-orm";
import {getDb} from "../db";
import {backtestResults,backtestRuns,engineVersions,lotteryDraws,mlRuns,numberStatistics,optimizerRuns,predictionResults,predictionRuns,predictions} from "../db/schema";
import {analyzeNumbers,DEFAULT_WEIGHTS,Draw,MIN_HISTORY,walkForwardBacktest} from "./analytics";

const ML_MINIMUM_DRAWS=500;
const OPTIMIZER_MIN_HISTORY=60;
const candidates=[
  DEFAULT_WEIGHTS,
  {recentFrequency:25,longTermFrequency:25,gap:20,pair:15,position:10,momentum:5},
  {recentFrequency:35,longTermFrequency:15,gap:20,pair:15,position:10,momentum:5},
  {recentFrequency:25,longTermFrequency:20,gap:25,pair:15,position:10,momentum:5},
  {recentFrequency:25,longTermFrequency:20,gap:20,pair:20,position:10,momentum:5},
  {recentFrequency:30,longTermFrequency:25,gap:15,pair:10,position:15,momentum:5},
  {recentFrequency:20,longTermFrequency:25,gap:20,pair:15,position:10,momentum:10}
];
type Weights=Record<string,number>;
type Eval={sampleSize:number;startDate:string|null;endDate:string|null;top1:number;top3:number;top5:number;top10:number};
function evaluate(draws:Draw[],indices:number[],weights:Weights):Eval{const ranks=indices.map(i=>analyzeNumbers(draws.slice(0,i),weights).find(x=>x.number===draws[i].last2)!.rank),n=ranks.length,rate=(k:number)=>n?100*ranks.filter(x=>x<=k).length/n:0;return{sampleSize:n,startDate:indices.length?draws[indices[0]].drawDate:null,endDate:indices.length?draws[indices.at(-1)!].drawDate:null,top1:rate(1),top3:rate(3),top5:rate(5),top10:rate(10)}}
const objective=(x:Eval)=>x.top1*4+x.top3*2+x.top5+x.top10*.5;
function splitTargets(n:number){const indices=Array.from({length:Math.max(0,n-OPTIMIZER_MIN_HISTORY)},(_,i)=>i+OPTIMIZER_MIN_HISTORY),a=Math.floor(indices.length*.6),b=Math.floor(indices.length*.8);return{train:indices.slice(0,a),validation:indices.slice(a,b),lockedTest:indices.slice(b)}}
function range(draws:Draw[],idx:number[]){return idx.length?`${draws[idx[0]].drawDate}..${draws[idx.at(-1)!].drawDate}`:"none"}
function nextDrawDate(last:string){const d=new Date(last+"T00:00:00Z"),y=d.getUTCFullYear(),m=d.getUTCMonth()+1,day=d.getUTCDate();if(day<16)return `${y}-${String(m).padStart(2,"0")}-16`;const nextM=m===12?1:m+1,nextY=m===12?y+1:y,nextDay=nextM===1||nextM===5?2:1;return `${nextY}-${String(nextM).padStart(2,"0")}-${String(nextDay).padStart(2,"0")}`}

async function selectWeights(draws:Draw[]){
  const split=splitTargets(draws.length),scored=candidates.map(weights=>({weights,train:evaluate(draws,split.train,weights)})).sort((a,b)=>objective(b.train)-objective(a.train));
  const finalists=scored.slice(0,3).map(x=>({...x,validation:evaluate(draws,split.validation,x.weights)})).sort((a,b)=>objective(b.validation)-objective(a.validation));
  const winner=finalists[0],lockedTest=evaluate(draws,split.lockedTest,winner.weights);
  return{weights:winner.weights,train:winner.train,validation:winner.validation,lockedTest,split};
}

export async function runAnalysisPipeline(){
  const db=getDb(),rows=await db.select().from(lotteryDraws).where(eq(lotteryDraws.validationStatus,"valid")).orderBy(lotteryDraws.drawDate),draws=rows.map(x=>({drawDate:x.drawDate,last2:x.last2}));
  if(draws.length<MIN_HISTORY)return{status:"insufficient_data",sampleSize:draws.length,minimum:MIN_HISTORY};
  const now=new Date().toISOString(),selected=await selectWeights(draws),version=`v3.1-stat-${rows.at(-1)!.drawDate}-n${rows.length}`;
  await db.update(engineVersions).set({active:false}).where(eq(engineVersions.active,true));
  let engine=(await db.select().from(engineVersions).where(eq(engineVersions.version,version)).limit(1))[0];
  if(!engine)[engine]=await db.insert(engineVersions).values({version,parameters:JSON.stringify(selected.weights),description:"Chronological train/validation selection with one locked-test evaluation",active:true,createdAt:now}).returning();
  else await db.update(engineVersions).set({active:true,parameters:JSON.stringify(selected.weights)}).where(eq(engineVersions.id,engine.id));
  const existingOpt=(await db.select().from(optimizerRuns).where(eq(optimizerRuns.engineVersionId,engine.id)).limit(1))[0];
  if(!existingOpt)await db.insert(optimizerRuns).values({engineVersionId:engine.id,weights:JSON.stringify(selected.weights),trainRange:range(draws,selected.split.train),trainCount:selected.train.sampleSize,validationRange:range(draws,selected.split.validation),validationCount:selected.validation.sampleSize,lockedTestRange:range(draws,selected.split.lockedTest),lockedTestCount:selected.lockedTest.sampleSize,trainMetrics:JSON.stringify(selected.train),validationMetrics:JSON.stringify(selected.validation),lockedTestMetrics:JSON.stringify(selected.lockedTest),createdAt:now});
  const stats=analyzeNumbers(draws,selected.weights);
  for(let i=0;i<stats.length;i+=25)for(const x of stats.slice(i,i+25))await db.insert(numberStatistics).values({number:x.number,period:"all",appearances:x.appearances,recentAppearances:x.recentAppearances,lastSeenDrawsAgo:x.lastSeenDrawsAgo,averageGap:x.averageGap,gapPercentile:x.gapPercentile,recentFrequencyScore:x.componentScores.recentFrequency,longTermFrequencyScore:x.componentScores.longTermFrequency,gapScore:x.componentScores.gap,pairScore:x.componentScores.pair,positionScore:x.componentScores.position,momentumScore:x.componentScores.momentum,finalScore:x.score,sampleSize:x.sampleSize,updatedAt:now}).onConflictDoUpdate({target:[numberStatistics.number,numberStatistics.period],set:{appearances:x.appearances,recentAppearances:x.recentAppearances,lastSeenDrawsAgo:x.lastSeenDrawsAgo,averageGap:x.averageGap,gapPercentile:x.gapPercentile,recentFrequencyScore:x.componentScores.recentFrequency,longTermFrequencyScore:x.componentScores.longTermFrequency,gapScore:x.componentScores.gap,pairScore:x.componentScores.pair,positionScore:x.componentScores.position,momentumScore:x.componentScores.momentum,finalScore:x.score,sampleSize:x.sampleSize,updatedAt:now}});
  const bt=walkForwardBacktest(draws,MIN_HISTORY);
  let backtest=(await db.select().from(backtestRuns).where(and(eq(backtestRuns.engineVersionId,engine.id),eq(backtestRuns.endDate,bt.endDate??""))).limit(1))[0];
  if(!backtest&&bt.sampleSize)[backtest]=await db.insert(backtestRuns).values({engineVersionId:engine.id,startDate:bt.startDate!,endDate:bt.endDate!,sampleSize:bt.sampleSize,top1Rate:bt.top1.rate,top3Rate:bt.top3.rate,top5Rate:bt.top5.rate,top10Rate:bt.top10.rate,splitMetadata:JSON.stringify({confidenceIntervals:{top1:bt.top1.ci95,top3:bt.top3.ci95,top5:bt.top5.ci95,top10:bt.top10.ci95},baselines:bt.baselines}),createdAt:now}).returning();
  if(backtest){const resultCount=(await db.select({count:sql<number>`count(*)`}).from(backtestResults).where(eq(backtestResults.backtestRunId,backtest.id)))[0]?.count??0;if(resultCount<bt.rows.length){for(let i=resultCount;i<bt.rows.length;i+=10)await db.insert(backtestResults).values(bt.rows.slice(i,i+10).map(x=>({backtestRunId:backtest.id,drawDate:x.drawDate,dataCutoff:x.dataCutoff,actualResult:x.actual,rank:x.rank,topPicks:JSON.stringify(x.topPicks)})))}}
  const lastMl=(await db.select().from(mlRuns).orderBy(desc(mlRuns.id)).limit(1))[0];
  if(!lastMl||lastMl.sampleSize!==draws.length)await db.insert(mlRuns).values({status:draws.length<ML_MINIMUM_DRAWS?"scientifically_unjustified":"experimental_not_promoted",reason:draws.length<ML_MINIMUM_DRAWS?`Fewer than ${ML_MINIMUM_DRAWS} draws gives fewer than five observations per 00–99 class on average; ML comparison would be unstable.`:"ML models require a separate reproducible training implementation before promotion.",minimumRequired:ML_MINIMUM_DRAWS,sampleSize:draws.length,splitMetadata:JSON.stringify({train:range(draws,selected.split.train),validation:range(draws,selected.split.validation),lockedTest:range(draws,selected.split.lockedTest),chronological:true,randomShuffle:false}),results:JSON.stringify({randomBaseline:{top1:1,top3:3,top5:5,top10:10},statisticalEngine:selected.lockedTest,logisticRegression:null,randomForest:null,gradientBoosting:null}),createdAt:now});
  await evaluateLockedPredictions(rows,now);
  const target=nextDrawDate(rows.at(-1)!.drawDate);
  if(target>new Date().toISOString().slice(0,10)){const inserted=await db.insert(predictionRuns).values({drawDate:target,engineVersionId:engine.id,parameters:JSON.stringify(selected.weights),dataCutoff:rows.at(-1)!.drawDate,generatedAt:now,lockedAt:now}).onConflictDoNothing({target:predictionRuns.drawDate}).returning({id:predictionRuns.id});const targetRun=inserted[0]??(await db.select({id:predictionRuns.id}).from(predictionRuns).where(eq(predictionRuns.drawDate,target)).limit(1))[0];if(targetRun){const predictionCount=(await db.select({count:sql<number>`count(*)`}).from(predictions).where(eq(predictions.runId,targetRun.id)))[0]?.count??0;for(let i=predictionCount;i<stats.length;i+=10)await db.insert(predictions).values(stats.slice(i,i+10).map(x=>({runId:targetRun.id,number:x.number,score:x.score,componentScores:JSON.stringify(x.componentScores),rank:x.rank,createdAt:now})))}}
  return{status:"ready",sampleSize:draws.length,engineVersion:version,weights:selected.weights,backtest:bt,train:selected.train,validation:selected.validation,lockedTest:selected.lockedTest,predictionTarget:target};
}

async function evaluateLockedPredictions(drawRows:(typeof lotteryDraws.$inferSelect)[],now:string){const db=getDb(),runs=await db.select().from(predictionRuns),byDate=new Map(drawRows.map(x=>[x.drawDate,x]));for(const run of runs){const draw=byDate.get(run.drawDate);if(!draw)continue;const prior=(await db.select().from(predictionResults).where(eq(predictionResults.predictionRunId,run.id)).limit(1))[0];if(prior)continue;const hit=(await db.select().from(predictions).where(and(eq(predictions.runId,run.id),eq(predictions.number,draw.last2))).limit(1))[0];await db.insert(predictionResults).values({predictionRunId:run.id,actualResult:draw.last2,matchedRank:hit?.rank??null,hitTop1:!!hit&&hit.rank<=1,hitTop3:!!hit&&hit.rank<=3,hitTop5:!!hit&&hit.rank<=5,hitTop10:!!hit&&hit.rank<=10,evaluatedAt:now})}}
