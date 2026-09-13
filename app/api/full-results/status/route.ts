import{env}from"cloudflare:workers";
export const dynamic="force-dynamic";
type Row={draw_date:string;completeness:string};
function rows<T>(value:unknown):T[]{if(!value||typeof value!=="object"||!("results" in value))return[];const result=(value as{results?:unknown}).results;return Array.isArray(result)?result as T[]:[]}
export async function GET(){try{const raw:unknown=await env.DB.prepare("SELECT draw_date,completeness FROM v3_full_prize_draws WHERE is_active=1 ORDER BY draw_date DESC").all(),items=rows<Row>(raw);return Response.json({status:"ready",draws:Object.fromEntries(items.map(x=>[x.draw_date,x.completeness]))},{headers:{"Cache-Control":"public, max-age=300"}})}catch{return Response.json({status:"unavailable",draws:{}},{headers:{"Cache-Control":"public, max-age=60"}})}}
