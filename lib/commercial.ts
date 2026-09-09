export const COMMERCIAL_LICENSE_STATUS="COMMERCIAL DATA LICENSE — UNRESOLVED";
export const COMMERCIAL_MONETIZATION_ENABLED=false;

export function commercialMonetizationGuard(environment:Record<string,string|undefined>=process.env){
  const requested=environment.COMMERCIAL_MONETIZATION_ENABLED?.toLowerCase()==="true";
  const approved=environment.COMMERCIAL_DATA_LICENSE_APPROVED?.toLowerCase()==="true";
  return{requested,approved,enabled:requested&&approved&&COMMERCIAL_MONETIZATION_ENABLED,status:COMMERCIAL_LICENSE_STATUS,warning:requested&&!approved?"Advertising refused: commercial data-source approval is not verified.":null};
}
