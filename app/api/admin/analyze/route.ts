import {runAnalysisPipeline} from "../../../../lib/engine";
import {requireAdminApi,unauthorized} from "../../../../lib/admin-auth";
import {acquireJobLock,releaseJobLock} from "../../../../lib/operational-guards";
export const dynamic="force-dynamic";
export async function POST(request:Request){if(!await requireAdminApi(request))return unauthorized();const owner=await acquireJobLock("analysis");if(!owner)return Response.json({status:"busy",message:"Analysis is already running"},{status:409});try{const result=await runAnalysisPipeline();if((request.headers.get("accept")??"").includes("text/html"))return Response.redirect(new URL("/admin?analysis="+encodeURIComponent(result.status),request.url),303);return Response.json(result)}catch(e){return Response.json({status:"failed",message:e instanceof Error?e.message:"Analysis failed"},{status:500})}finally{await releaseJobLock("analysis",owner)}}
