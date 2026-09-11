export type ModelScore={kind:"model_score";value:number;scale:100};
export type HistoricalRate={kind:"historical_rate";value:number;unit:"percent"};
export function normalizeModelScore(value:number,maximum:number):ModelScore{const normalized=Number.isFinite(value)&&Number.isFinite(maximum)&&maximum>0?Math.max(0,Math.min(100,value/maximum*100)):0;return{kind:"model_score",value:normalized,scale:100}}
export function historicalRate(value:number):HistoricalRate{return{kind:"historical_rate",value,unit:"percent"}}
