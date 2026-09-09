export const csvCell=(value:unknown)=>`"${String(value??"").replaceAll('"','""')}"`;
export function serializeCsv(rows:Record<string,unknown>[]){if(!rows.length)return"";const columns=Object.keys(rows[0]);return[columns.map(csvCell).join(","),...rows.map(row=>columns.map(column=>csvCell(row[column])).join(","))].join("\r\n")+"\r\n"}
