import {LotteryDraw,ProviderPayloadError,ProviderResult} from "./providers";
export type QueueCandidate={id:number;candidateDate:string;attempts:number};
export type QueueUpdate={status:string;attempts:number;lastError:string|null;lastAttemptAt:string;completedAt?:string|null};
export interface ImportPersistence{
  insertDraw(draw:LotteryDraw,now:string):Promise<boolean>;
  insertRejected(input:{requestedDate:string;provider:string;sourceUrl:string;reason:string;rawPayload:string;payloadHash:string;createdAt:string}):Promise<void>;
  updateCandidate(id:number,update:QueueUpdate):Promise<void>;
}
export type ImportOutcome="imported"|"duplicate"|"rejected"|"no_result"|"retry"|"failed";
export function payloadHasPrizeShape(raw:unknown){return /"(first|last2|last3f|last3b)"\s*:/.test(JSON.stringify(raw))}
export async function sha256(value:unknown){const bytes=new TextEncoder().encode(JSON.stringify(value));return[...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(x=>x.toString(16).padStart(2,"0")).join("")}
export async function processImportCandidate(input:{row:QueueCandidate;fetch:()=>Promise<ProviderResult>;store:ImportPersistence;providerName:string;sourceUrl:string;now:string}):Promise<ImportOutcome>{
  const{row,fetch,store,providerName,sourceUrl,now}=input,nextAttempts=row.attempts+1;
  try{const{draw}=await fetch(),inserted=await store.insertDraw(draw,now);await store.updateCandidate(row.id,{status:inserted?"imported":"duplicate",attempts:nextAttempts,lastError:null,lastAttemptAt:now,completedAt:now});return inserted?"imported":"duplicate"}
  catch(error){const message=error instanceof Error?error.message:"Unknown import failure",raw=error instanceof ProviderPayloadError?error.raw:null;
    if(raw!==null&&!payloadHasPrizeShape(raw)){await store.updateCandidate(row.id,{status:"no_result",attempts:nextAttempts,lastError:message,lastAttemptAt:now,completedAt:now});return"no_result"}
    if(raw!==null){await store.insertRejected({requestedDate:row.candidateDate,provider:providerName,sourceUrl,reason:message,rawPayload:JSON.stringify(raw).slice(0,120000),payloadHash:await sha256(raw),createdAt:now});await store.updateCandidate(row.id,{status:"rejected",attempts:nextAttempts,lastError:message,lastAttemptAt:now,completedAt:now});return"rejected"}
    const status=nextAttempts>=3?"failed":"retry";await store.updateCandidate(row.id,{status,attempts:nextAttempts,lastError:message,lastAttemptAt:now});return status}
}
