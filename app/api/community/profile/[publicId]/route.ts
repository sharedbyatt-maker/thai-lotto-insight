import{publicProfile}from"../../../../../lib/community-db";
export const dynamic="force-dynamic";export async function GET(_request:Request,{params}:{params:Promise<{publicId:string}>}){const{publicId}=await params,profile=await publicProfile(publicId);return profile?Response.json(profile,{headers:{"cache-control":"public, max-age=60"}}):Response.json({error:"Profile not found"},{status:404})}
