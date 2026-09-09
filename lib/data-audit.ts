export type AuditableDraw={drawDate:string;firstPrize:string;front31:string;front32:string;last31:string;last32:string;last2:string;sourceHash:string|null;validationStatus:string};
export type DataAnomaly={drawDate:string;field:string;reason:string};
export function auditVerifiedDraws(rows:AuditableDraw[]){
  const anomalies:DataAnomaly[]=[],seen=new Set<string>();let previous="";
  const check=(row:AuditableDraw,field:keyof AuditableDraw,length:number)=>{if(!new RegExp(`^\\d{${length}}$`).test(String(row[field]??"")))anomalies.push({drawDate:row.drawDate,field:String(field),reason:`must be exactly ${length} digits`})};
  for(const row of rows){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(row.drawDate)||Number.isNaN(Date.parse(row.drawDate+"T00:00:00Z")))anomalies.push({drawDate:row.drawDate,field:"drawDate",reason:"invalid ISO date"});
    check(row,"firstPrize",6);for(const field of ["front31","front32","last31","last32"] as const)check(row,field,3);check(row,"last2",2);
    if(seen.has(row.drawDate))anomalies.push({drawDate:row.drawDate,field:"drawDate",reason:"duplicate date"});seen.add(row.drawDate);
    if(previous&&row.drawDate<=previous)anomalies.push({drawDate:row.drawDate,field:"drawDate",reason:"not strictly chronological"});previous=row.drawDate;
    if(!/^[a-f0-9]{64}$/.test(row.sourceHash??""))anomalies.push({drawDate:row.drawDate,field:"sourceHash",reason:"missing or invalid SHA-256"});
    if(row.validationStatus!=="valid")anomalies.push({drawDate:row.drawDate,field:"validationStatus",reason:"not valid"});
  }
  return{drawCount:rows.length,anomalyCount:anomalies.length,anomalies};
}
