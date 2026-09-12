import {requireAdminApi,unauthorized} from "../../../../lib/admin-auth";
import {runFullPrizeBackfill} from "../../../../lib/full-prize-backfill";
import {getFullPrizeBackfillStatus} from "../../../../lib/full-prize-store";

export const dynamic="force-dynamic";

export async function GET(request:Request){
  if(!await requireAdminApi(request))return unauthorized();
  try{return Response.json({status:"ok",backfill:await getFullPrizeBackfillStatus()})}
  catch(error){return Response.json({status:"error",message:error instanceof Error?error.message:"Backfill status failed"},{status:500})}
}

export async function POST(request:Request){
  if(!await requireAdminApi(request))return unauthorized();
  try{
    const contentType=request.headers.get("content-type")??"";
    let limit=5;
    if(contentType.includes("application/json")){
      const body=await request.json().catch(()=>({})) as {limit?:unknown};
      limit=Number(body.limit??5);
    }else{
      const form=await request.formData().catch(()=>null);
      limit=Number(form?.get("limit")??5);
    }
    const result=await runFullPrizeBackfill(Number.isFinite(limit)?limit:5);
    return Response.json({status:"ok",...result});
  }catch(error){
    return Response.json({status:"error",message:error instanceof Error?error.message:"Full-prize backfill failed"},{status:502});
  }
}
