import {checkTicket,fetchVerifiedFullDraw,normalizeTicket} from "../../../lib/full-ticket-checker";

export async function POST(request:Request){
  try{
    const body=await request.json() as {ticket?:unknown;date?:unknown};
    const ticket=normalizeTicket(body.ticket);
    const date=typeof body.date==="string"&&body.date.trim()?body.date.trim():undefined;
    const draw=await fetchVerifiedFullDraw(date);
    const result=checkTicket(ticket,draw);
    return Response.json({status:"ok",result,draw:{drawDate:draw.drawDate,completeness:draw.completeness,source:draw.source,sourceUrl:draw.sourceUrl,verifiedAt:draw.verifiedAt}});
  }catch(error){
    const message=error instanceof Error?error.message:"Ticket check failed";
    const invalid=/exactly 6 digits|Unsupported draw date|Invalid draw date/.test(message);
    return Response.json({status:"error",message:invalid?message:"Official GLO verification is temporarily unavailable. No fallback result was fabricated."},{status:invalid?400:502});
  }
}
