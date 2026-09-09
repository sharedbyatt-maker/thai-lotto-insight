export const GLO_DATE_API="https://www.glo.or.th/api/checking/getLotteryResult";
export const GLO_LATEST_API="https://www.glo.or.th/api/lottery/getLatestLottery";
export const GLO_RESOURCE_ID="64b39af8-fd9a-4eab-87d4-9193768c3812";
export const GLO_CATALOG_URL="https://gdcatalog.glo.or.th/dataset/dataset_c4-9_01";

export type NormalizedDraw={drawDate:string;firstPrize:string;front31:string;front32:string;last31:string;last32:string;last2:string;sourceName:string;sourceUrl:string;sourceResourceId:string;sourceDocumentUrl:string|null;sourceTimestamp:string|null;sourceHash:string;verificationStatus:"api_validated"};
export type ProviderResult={draw:NormalizedDraw;raw:unknown};
export interface LotteryDataProvider{name:string;fetchLatest():Promise<ProviderResult>;fetchByDate(date:string):Promise<ProviderResult>}
export class ProviderPayloadError extends Error{constructor(message:string,public raw:unknown){super(message);this.name="ProviderPayloadError"}}

const THAI_MONTHS:Record<string,number>={"มกราคม":1,"ม.ค.":1,"กุมภาพันธ์":2,"ก.พ.":2,"มีนาคม":3,"มี.ค.":3,"เมษายน":4,"เม.ย.":4,"พฤษภาคม":5,"พ.ค.":5,"มิถุนายน":6,"มิ.ย.":6,"กรกฎาคม":7,"ก.ค.":7,"สิงหาคม":8,"ส.ค.":8,"กันยายน":9,"ก.ย.":9,"ตุลาคม":10,"ต.ค.":10,"พฤศจิกายน":11,"พ.ย.":11,"ธันวาคม":12,"ธ.ค.":12};
const thaiDigits=(s:string)=>s.replace(/[๐-๙]/g,c=>String("๐๑๒๓๔๕๖๗๘๙".indexOf(c)));
const iso=(y:number,m:number,d:number)=>{if(y>2400)y-=543;const x=new Date(Date.UTC(y,m-1,d));if(x.getUTCFullYear()!==y||x.getUTCMonth()!==m-1||x.getUTCDate()!==d)throw new Error("Invalid draw date");return `${String(y).padStart(4,"0")}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`};

export function normalizeDrawDate(value:unknown):string{
  const s=thaiDigits(String(value??"").trim()).replace(/\s+/g," ");
  let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/);if(m)return iso(+m[1],+m[2],+m[3]);
  m=s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);if(m)return iso(+m[3],+m[2],+m[1]);
  m=s.match(/(?:วันที่\s*)?(\d{1,2})\s+([^\s]+)\s+(\d{4})/);if(m&&THAI_MONTHS[m[2]])return iso(+m[3],THAI_MONTHS[m[2]],+m[1]);
  throw new Error(`Unsupported draw date format: ${s||"empty"}`);
}

const isObject=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==="object";
function deepFind(root:unknown,key:string):unknown{const seen=new Set<unknown>();const walk=(x:unknown):unknown=>{if(!isObject(x)||seen.has(x))return undefined;seen.add(x);if(Object.prototype.hasOwnProperty.call(x,key))return x[key];for(const v of Array.isArray(x)?x:Object.values(x)){const hit=walk(v);if(hit!==undefined)return hit}return undefined};return walk(root)}
function prizeValues(v:unknown):string[]{
  const source=isObject(v)&&"number" in v?v.number:v;
  const values=Array.isArray(source)?source:typeof source==="string"?source.split(/[,\s]+/):[source];
  return values.flatMap(x=>{const y=isObject(x)?(x.value??x.number??x.lottery_num):x;return y===undefined||y===null?[]:[thaiDigits(String(y).trim())]});
}
function exact(v:unknown,length:number,label:string):string{const s=thaiDigits(String(v??"").trim());if(!new RegExp(`^\\d{${length}}$`).test(s))throw new Error(`${label} must be exactly ${length} digits`);return s}
async function digest(raw:unknown){const bytes=new TextEncoder().encode(JSON.stringify(raw));return [...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(x=>x.toString(16).padStart(2,"0")).join("")}

export async function normalizeGloResponse(raw:unknown,sourceUrl:string,requestedDate?:string):Promise<NormalizedDraw>{
  const first=prizeValues(deepFind(raw,"first"));
  const front=prizeValues(deepFind(raw,"last3f"));
  const back=prizeValues(deepFind(raw,"last3b"));
  const last2=prizeValues(deepFind(raw,"last2"));
  const reported=deepFind(raw,"displayDate")??deepFind(raw,"period_date")??deepFind(raw,"date");
  const drawDate=reported?normalizeDrawDate(reported):requestedDate?normalizeDrawDate(requestedDate):(()=>{throw new Error("Response has no draw date")})();
  if(requestedDate&&drawDate!==normalizeDrawDate(requestedDate))throw new Error(`Requested ${requestedDate} but GLO reported ${drawDate}`);
  if(first.length!==1)throw new Error(`Expected one first prize, received ${first.length}`);
  if(front.length!==2)throw new Error(`Expected two front-3 prizes, received ${front.length}`);
  if(back.length!==2)throw new Error(`Expected two last-3 prizes, received ${back.length}`);
  if(last2.length!==1)throw new Error(`Expected one last-2 prize, received ${last2.length}`);
  return{drawDate,firstPrize:exact(first[0],6,"first_prize"),front31:exact(front[0],3,"front_3_1"),front32:exact(front[1],3,"front_3_2"),last31:exact(back[0],3,"last_3_1"),last32:exact(back[1],3,"last_3_2"),last2:exact(last2[0],2,"last_2"),sourceName:"Government Lottery Office (GLO)",sourceUrl,sourceResourceId:GLO_RESOURCE_ID,sourceDocumentUrl:String(deepFind(raw,"pdf_url")??"")||null,sourceTimestamp:String(deepFind(raw,"updated_at")??deepFind(raw,"timestamp")??"")||null,sourceHash:await digest(raw),verificationStatus:"api_validated"};
}

async function post(url:string,body?:unknown){const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json","accept":"application/json","user-agent":"ThaiLottoInsight/3.1 (+historical-import)"},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const text=await r.text();if(!r.ok)throw new Error(`GLO HTTP ${r.status}: ${text.slice(0,160)}`);try{return JSON.parse(text)}catch{throw new Error("GLO returned a non-JSON response")}}

export class GLOProvider implements LotteryDataProvider{
  name="Government Lottery Office (GLO)";
  async fetchLatest(){const raw=await post(GLO_LATEST_API);try{return{raw,draw:await normalizeGloResponse(raw,GLO_LATEST_API)}}catch(e){throw new ProviderPayloadError(e instanceof Error?e.message:"Invalid GLO payload",raw)}}
  async fetchByDate(date:string){const normalized=normalizeDrawDate(date),[year,month,day]=normalized.split("-");const raw=await post(GLO_DATE_API,{date:day,month,year});try{return{raw,draw:await normalizeGloResponse(raw,GLO_DATE_API,normalized)}}catch(e){throw new ProviderPayloadError(e instanceof Error?e.message:"Invalid GLO payload",raw)}}
}
