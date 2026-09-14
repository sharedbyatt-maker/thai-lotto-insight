import {checkTicket,getStoredFullDraw,normalizeTicket} from "../../../lib/full-ticket-checker";
import {consumeRateLimit} from "../../../lib/operational-guards";
import {validateRequestBody} from "../../../lib/http-security";

export async function POST(request:Request){
  try{
    const invalid=validateRequestBody(request,{maxBytes:2048});if(invalid)return invalid;
    const rate=await consumeRateLimit(request,"ticket-check");if(!rate.allowed)return Response.json({status:"error",message:"Too many ticket checks. Please try again shortly."},{status:429,headers:{"Retry-After":String(rate.retryAfterSeconds)}});
    const body=await request.json() as {ticket?:unknown;date?:unknown};
    const ticket=normalizeTicket(body.ticket);
    const date=typeof body.date==="string"&&body.date.trim()?body.date.trim():undefined;
    const draw=await getStoredFullDraw(date);
    const result=checkTicket(ticket,draw);
    return Response.json({status:"ok",result,draw:{drawDate:draw.drawDate,completeness:draw.completeness,source:draw.source,sourceUrl:draw.sourceUrl,verifiedAt:draw.verifiedAt,servedFrom:"verified_database"}});
  }catch(error){
    const message=error instanceof Error?error.message:"Ticket check failed";
    const invalid=/exactly 6 digits|Unsupported draw date|Invalid draw date/.test(message);
    return Response.json({status:"error",message:invalid?message:"Verified result data is not available in the archive yet."},{status:invalid?400:404});
  }
}
