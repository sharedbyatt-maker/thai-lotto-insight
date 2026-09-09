import {eq} from "drizzle-orm";
import {getDb} from "../../../../db";
import {dataAuditRuns,lotteryDraws} from "../../../../db/schema";
import {auditVerifiedDraws} from "../../../../lib/data-audit";
import {requireAdminApi,unauthorized} from "../../../../lib/admin-auth";
export const dynamic="force-dynamic";
export async function POST(request:Request){
  if(!await requireAdminApi(request))return unauthorized();
  const db=getDb(),startedAt=new Date().toISOString(),rows=await db.select().from(lotteryDraws).where(eq(lotteryDraws.validationStatus,"valid")).orderBy(lotteryDraws.drawDate),result=auditVerifiedDraws(rows),completedAt=new Date().toISOString();
  const [audit]=await db.insert(dataAuditRuns).values({drawCount:result.drawCount,anomalyCount:result.anomalyCount,anomalies:JSON.stringify(result.anomalies),startedAt,completedAt}).returning();
  return Response.json({...result,auditId:audit.id,startedAt,completedAt});
}
