import {importHistoricalBatch} from "../../../../lib/importer";
import {runAnalysisPipeline} from "../../../../lib/engine";
import {requireAdminApi,unauthorized} from "../../../../lib/admin-auth";

export const dynamic="force-dynamic";
export async function POST(request:Request){
  if(!await requireAdminApi(request))return unauthorized();
  const form=await request.formData().catch(()=>null),limit=Number(form?.get("limit")??12);
  try{
    const result=await importHistoricalBatch(Number.isFinite(limit)?limit:12),analysis=result.remaining===0?await runAnalysisPipeline():null;
    if((request.headers.get("accept")??"").includes("text/html"))return Response.redirect(new URL("/admin?sync="+encodeURIComponent(result.status),request.url),303);
    return Response.json({...result,analysis});
  }catch(e){
    const message=e instanceof Error?e.message:"Sync failed";
    return Response.json({status:"failed",message},{status:502});
  }
}
