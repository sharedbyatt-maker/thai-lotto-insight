import{GET as dashboard}from"../dashboard/route";
export const dynamic="force-dynamic";
export async function GET(){const response=await dashboard();if(!response.ok)return response;const d=await response.json();return Response.json({status:d.status,message:d.message,latest:d.latest,drawCount:d.drawCount,lockedPrediction:d.lockedPrediction?{picks:d.lockedPrediction.picks}:null,dataMeta:d.dataMeta},{headers:{"Cache-Control":"public, max-age=120, stale-while-revalidate=600"}})}
