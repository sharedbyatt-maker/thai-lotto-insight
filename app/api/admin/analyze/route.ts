import {getChatGPTUser} from "../../../chatgpt-auth";
import {runAnalysisPipeline} from "../../../../lib/engine";
export const dynamic="force-dynamic";
async function authorized(request:Request){const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,""),machine=!!process.env.SYNC_TOKEN&&token===process.env.SYNC_TOKEN;if(machine)return true;const u=await getChatGPTUser();return !!u&&!!process.env.ADMIN_EMAIL&&u.email.toLowerCase()===process.env.ADMIN_EMAIL.toLowerCase()}
export async function POST(request:Request){if(!await authorized(request))return Response.json({error:"Unauthorized"},{status:401});try{const result=await runAnalysisPipeline();if((request.headers.get("accept")??"").includes("text/html"))return Response.redirect(new URL("/admin?analysis="+encodeURIComponent(result.status),request.url),303);return Response.json(result)}catch(e){return Response.json({status:"failed",message:e instanceof Error?e.message:"Analysis failed"},{status:500})}}
