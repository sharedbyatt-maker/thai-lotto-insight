export const COMMERCIAL_LICENSE_STATUS="SOURCE ATTRIBUTION REQUIRED";
export const COMMERCIAL_MONETIZATION_ENABLED=false;

export function commercialMonetizationGuard(environment:Record<string,string|undefined>=process.env){
  const requested=environment.COMMERCIAL_MONETIZATION_ENABLED?.toLowerCase()==="true";
  const configured=environment.ADS_PROVIDER_CONFIGURED?.toLowerCase()==="true";
  return{requested,configured,enabled:requested&&configured,status:COMMERCIAL_LICENSE_STATUS,warning:requested&&!configured?"Advertising remains off until a provider and consent configuration are ready.":null};
}
