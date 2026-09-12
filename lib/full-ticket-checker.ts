import {GLO_DATE_API,GLO_LATEST_API,normalizeDrawDate} from "./providers";

export const GLO_TICKET_CHECK_API="https://www.glo.or.th/api/checking/getcheckLotteryResult";
export type PrizeCategory="FIRST_PRIZE"|"NEAR_FIRST_PRIZE"|"FRONT_3"|"LAST_3"|"LAST_2"|"SECOND_PRIZE"|"THIRD_PRIZE"|"FOURTH_PRIZE"|"FIFTH_PRIZE";
export type Completeness="FULL_PRIZE_SET_VERIFIED"|"SUMMARY_VERIFIED";
export type FullPrizeDraw={drawDate:string;firstPrize:string;nearFirst:string[];front3:string[];last3:string[];last2:string;secondPrize:string[];thirdPrize:string[];fourthPrize:string[];fifthPrize:string[];source:string;sourceUrl:string;sourceHash:string;verifiedAt:string;completeness:Completeness};
export type TicketMatch={category:PrizeCategory;matchedNumber:string;verificationSource:string};
export type TicketCheckResult={ticket:string;drawDate:string;isWinner:boolean;matchedPrizes:TicketMatch[];highestPrizeCategory:PrizeCategory|null;officialSource:string;verificationStatus:Completeness;sourceHash:string};

const THAI_DIGITS="๐๑๒๓๔๕๖๗๘๙";
const thaiDigits=(s:string)=>s.replace(/[๐-๙]/g,c=>String(THAI_DIGITS.indexOf(c)));
const isObject=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==="object";
function deepFind(root:unknown,key:string):unknown{const seen=new Set<unknown>();const walk=(x:unknown):unknown=>{if(!isObject(x)||seen.has(x))return undefined;seen.add(x);if(Object.prototype.hasOwnProperty.call(x,key))return x[key];for(const v of Array.isArray(x)?x:Object.values(x)){const hit=walk(v);if(hit!==undefined)return hit}return undefined};return walk(root)}
function values(v:unknown):string[]{const source=isObject(v)&&"number" in v?v.number:v;const list=Array.isArray(source)?source:typeof source==="string"?source.split(/[,\s]+/):source==null?[]:[source];return list.flatMap(x=>{const y=isObject(x)?(x.value??x.number??x.lottery_num):x;return y==null?[]:[thaiDigits(String(y).trim())]}).filter(Boolean)}
function exactList(v:unknown,length:number,label:string):string[]{const out=values(v);for(const n of out)if(!new RegExp(`^\\d{${length}}$`).test(n))throw new Error(`${label} contains invalid ${length}-digit value`);return [...new Set(out)]}
function one(v:unknown,length:number,label:string):string{const out=exactList(v,length,label);if(out.length!==1)throw new Error(`${label} must contain exactly one value`);return out[0]}
function officialPayload(raw:unknown):unknown{if(!isObject(raw)||!isObject(raw.response))return raw;return isObject(raw.response.result)?raw.response.result:raw.response}
function payloadDate(payload:unknown):unknown{if(!isObject(payload))return undefined;const direct=payload.date??payload.period_date;if(typeof direct==="string"||typeof direct==="number")return direct;const display=payload.displayDate;if(typeof display==="string"||typeof display==="number")return display;if(isObject(display)&&display.year!==undefined&&display.month!==undefined&&display.date!==undefined)return `${display.year}-${display.month}-${display.date}`;return undefined}
async function digest(raw:unknown){const bytes=new TextEncoder().encode(JSON.stringify(raw));return [...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(x=>x.toString(16).padStart(2,"0")).join("")}

export function normalizeTicket(value:unknown):string{const ticket=thaiDigits(String(value??"").trim());if(!/^\d{6}$/.test(ticket))throw new Error("Ticket number must be exactly 6 digits");return ticket}

export async function normalizeFullGloResponse(raw:unknown,sourceUrl:string,requestedDate?:string):Promise<FullPrizeDraw>{
  const payload=officialPayload(raw);
  const reported=payloadDate(payload);
  const drawDate=reported?normalizeDrawDate(reported):requestedDate?normalizeDrawDate(requestedDate):(()=>{throw new Error("Response has no draw date")})();
  if(requestedDate&&drawDate!==normalizeDrawDate(requestedDate))throw new Error(`Requested ${requestedDate} but GLO reported ${drawDate}`);
  const firstPrize=one(deepFind(payload,"first"),6,"first");
  const nearFirst=exactList(deepFind(payload,"near1"),6,"near1");
  const front3=exactList(deepFind(payload,"last3f"),3,"last3f");
  const last3=exactList(deepFind(payload,"last3b"),3,"last3b");
  const last2=one(deepFind(payload,"last2"),2,"last2");
  const secondPrize=exactList(deepFind(payload,"second"),6,"second");
  const thirdPrize=exactList(deepFind(payload,"third"),6,"third");
  const fourthPrize=exactList(deepFind(payload,"fourth"),6,"fourth");
  const fifthPrize=exactList(deepFind(payload,"fifth"),6,"fifth");
  const completeness:Completeness=nearFirst.length>0&&front3.length>0&&last3.length>0&&secondPrize.length>0&&thirdPrize.length>0&&fourthPrize.length>0&&fifthPrize.length>0?"FULL_PRIZE_SET_VERIFIED":"SUMMARY_VERIFIED";
  return{drawDate,firstPrize,nearFirst,front3,last3,last2,secondPrize,thirdPrize,fourthPrize,fifthPrize,source:"Government Lottery Office (GLO)",sourceUrl,sourceHash:await digest(raw),verifiedAt:new Date().toISOString(),completeness};
}

const hierarchy:PrizeCategory[]=["FIRST_PRIZE","NEAR_FIRST_PRIZE","SECOND_PRIZE","THIRD_PRIZE","FOURTH_PRIZE","FIFTH_PRIZE","FRONT_3","LAST_3","LAST_2"];
export function checkTicket(ticketValue:unknown,draw:FullPrizeDraw):TicketCheckResult{
  const ticket=normalizeTicket(ticketValue),matches:TicketMatch[]=[];
  const add=(category:PrizeCategory,matchedNumber:string)=>matches.push({category,matchedNumber,verificationSource:draw.source});
  if(ticket===draw.firstPrize)add("FIRST_PRIZE",draw.firstPrize);
  for(const n of draw.nearFirst)if(ticket===n)add("NEAR_FIRST_PRIZE",n);
  for(const n of draw.secondPrize)if(ticket===n)add("SECOND_PRIZE",n);
  for(const n of draw.thirdPrize)if(ticket===n)add("THIRD_PRIZE",n);
  for(const n of draw.fourthPrize)if(ticket===n)add("FOURTH_PRIZE",n);
  for(const n of draw.fifthPrize)if(ticket===n)add("FIFTH_PRIZE",n);
  for(const n of draw.front3)if(ticket.slice(0,3)===n)add("FRONT_3",n);
  for(const n of draw.last3)if(ticket.slice(-3)===n)add("LAST_3",n);
  if(ticket.slice(-2)===draw.last2)add("LAST_2",draw.last2);
  matches.sort((a,b)=>hierarchy.indexOf(a.category)-hierarchy.indexOf(b.category));
  return{ticket,drawDate:draw.drawDate,isWinner:matches.length>0,matchedPrizes:matches,highestPrizeCategory:matches[0]?.category??null,officialSource:draw.source,verificationStatus:draw.completeness,sourceHash:draw.sourceHash};
}

async function post(url:string,body?:unknown){const response=await fetch(url,{method:"POST",headers:{"content-type":"application/json","accept":"application/json","user-agent":"ThaiLottoInsight/3.2 (+full-ticket-checker)"},body:body===undefined?undefined:JSON.stringify(body),cache:"no-store",signal:AbortSignal.timeout(15000)});const text=await response.text();if(!response.ok)throw new Error(`GLO HTTP ${response.status}`);try{return JSON.parse(text)}catch{throw new Error("GLO returned non-JSON data")}}

export async function fetchOfficialFullDraw(date?:string):Promise<FullPrizeDraw>{
  if(date){
    const normalized=normalizeDrawDate(date),[year,month,day]=normalized.split("-");
    const raw=await post(GLO_DATE_API,{date:day,month,year});
    return normalizeFullGloResponse(raw,GLO_DATE_API,normalized);
  }
  const raw=await post(GLO_LATEST_API);
  return normalizeFullGloResponse(raw,GLO_LATEST_API);
}

async function persistBestEffort(draw:FullPrizeDraw){try{const {persistFullPrizeDraw}=await import("./full-prize-store");await persistFullPrizeDraw(draw)}catch{/* Storage may not be migrated yet; verified API checking must still work. */}}

export async function fetchVerifiedFullDraw(date?:string):Promise<FullPrizeDraw>{
  if(date){
    const normalized=normalizeDrawDate(date);
    try{const {getPersistedFullDraw}=await import("./full-prize-store");const cached=await getPersistedFullDraw(normalized);if(cached)return cached}catch{/* Fall through to verified official source. */}
    const draw=await fetchOfficialFullDraw(normalized);
    await persistBestEffort(draw);
    return draw;
  }
  const draw=await fetchOfficialFullDraw();
  await persistBestEffort(draw);
  return draw;
}
