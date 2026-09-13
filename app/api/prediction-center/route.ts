import{GET as dashboard}from"../dashboard/route";
export const dynamic="force-dynamic";
export async function GET(){const response=await dashboard();if(!response.ok)return response;const d=await response.json();return Response.json({status:d.status,message:d.message,dataMeta:d.dataMeta,latestRun:d.latestRun,lockedPrediction:d.lockedPrediction,digitFirst:d.digitFirst,digitCandidate:d.digitCandidate,patternLab:d.patternLab},{headers:{"Cache-Control":"public, max-age=300, stale-while-revalidate=1800"}})}
