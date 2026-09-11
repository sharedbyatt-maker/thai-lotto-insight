import{publicBuildInfo}from"../../../lib/build-info";
export const dynamic="force-dynamic";
export async function GET(){return Response.json(publicBuildInfo(),{headers:{"Cache-Control":"public, max-age=60"}})}
