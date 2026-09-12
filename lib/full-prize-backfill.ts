import {fetchOfficialFullDraw} from "./full-ticket-checker";
import {getFullPrizeBackfillStatus,markBackfillAttempt,nextBackfillDates,persistFullPrizeDraw,seedFullPrizeBackfill} from "./full-prize-store";

export type FullPrizeBackfillRun={seeded:number;requested:number;processed:number;completed:number;failed:number;full:number;summary:number;items:{drawDate:string;status:"completed"|"failed";completeness?:string;error?:string}[];status:Awaited<ReturnType<typeof getFullPrizeBackfillStatus>>};

export async function runFullPrizeBackfill(limit=5):Promise<FullPrizeBackfillRun>{
  const safeLimit=Math.max(1,Math.min(10,Math.floor(limit)||5));
  const seeded=await seedFullPrizeBackfill();
  const dates=await nextBackfillDates(safeLimit);
  const items:FullPrizeBackfillRun["items"]=[];
  let completed=0,failed=0,full=0,summary=0;
  for(const drawDate of dates){
    try{
      const draw=await fetchOfficialFullDraw(drawDate);
      await persistFullPrizeDraw(draw);
      await markBackfillAttempt(drawDate,undefined,draw);
      completed++;
      if(draw.completeness==="FULL_PRIZE_SET_VERIFIED")full++;else summary++;
      items.push({drawDate,status:"completed",completeness:draw.completeness});
    }catch(error){
      failed++;
      await markBackfillAttempt(drawDate,error);
      items.push({drawDate,status:"failed",error:error instanceof Error?error.message:String(error)});
    }
  }
  return{seeded,requested:safeLimit,processed:dates.length,completed,failed,full,summary,items,status:await getFullPrizeBackfillStatus()};
}
