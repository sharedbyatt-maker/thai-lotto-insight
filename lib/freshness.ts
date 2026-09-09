export const STALE_AFTER_HOURS=72;
export const ACTIVE_SOURCE={name:"Government Lottery Office (GLO)",resourceId:"64b39af8-fd9a-4eab-87d4-9193768c3812",endpoint:"https://www.glo.or.th/api/checking/getLotteryResult"} as const;

export function dataFreshness(lastSuccessfulSync:string|null|undefined,now=new Date()){
  if(!lastSuccessfulSync)return{state:"stale_data" as const,isStale:true,ageHours:null,thresholdHours:STALE_AFTER_HOURS};
  const ageHours=Math.max(0,(now.getTime()-new Date(lastSuccessfulSync).getTime())/3_600_000);
  return{state:ageHours>STALE_AFTER_HOURS?"stale_data" as const:"fresh" as const,isStale:ageHours>STALE_AFTER_HOURS,ageHours,thresholdHours:STALE_AFTER_HOURS};
}

export function publicDataMetadata(input:{dataCutoff:string|null;lastSuccessfulSync:string|null;now?:Date}){
  return{dataCutoff:input.dataCutoff,lastSuccessfulSync:input.lastSuccessfulSync,source:ACTIVE_SOURCE,freshness:dataFreshness(input.lastSuccessfulSync,input.now)};
}
