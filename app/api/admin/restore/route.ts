import {sql} from "drizzle-orm";
import {getDb} from "../../../../db";
import * as schema from "../../../../db/schema";
import {requireAdminApi,unauthorized} from "../../../../lib/admin-auth";
import {validateRequestBody} from "../../../../lib/http-security";
export const dynamic="force-dynamic";
const order=["lotteryDraws","rejectedDraws","importQueue","engineVersions","predictionRuns","predictions","predictionResults","numberStatistics","backtestRuns","backtestResults","optimizerRuns","mlRuns","syncRuns","sourceVerifications","providerHealthEvents","dataAuditRuns","systemEvents","communityUsers","communitySubmissions","communitySubmissionRevisions","communitySettlements","communityFavorites","communityNotifications","communityRateLimits","fullPrizeDraws","fullPrizeEntries","fullPrizeBackfill"] as const;
export async function POST(request:Request){
  if(!await requireAdminApi(request))return unauthorized();
  const invalid=validateRequestBody(request,{maxBytes:10_000_000});if(invalid)return invalid;
  if(request.headers.get("x-confirm-restore")!=="RESTORE_EMPTY_DATABASE")return Response.json({error:"Restore confirmation header is required"},{status:409});
  const db=getDb(),existing=(await db.select({count:sql<number>`count(*)`}).from(schema.lotteryDraws))[0]?.count??0;
  if(existing)return Response.json({error:"Restore is allowed only into an empty database",existingDraws:existing},{status:409});
  const backup=await request.json().catch(()=>null) as any;
  if(!backup||!["v3.2","v3.3"].includes(backup.schemaVersion)||!backup.tables)return Response.json({error:"Invalid V3.2/V3.3 backup"},{status:400});
  const restored:Record<string,number>={};
  for(const name of order){const rows=Array.isArray(backup.tables[name])?backup.tables[name]:[],table=schema[name];for(let i=0;i<rows.length;i+=20)await (db.insert(table as any).values(rows.slice(i,i+20) as any).onConflictDoNothing() as any);restored[name]=rows.length}
  return Response.json({status:"restored",restored});
}
