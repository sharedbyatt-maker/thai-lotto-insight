import { latestDueDrawDate } from "./draw-calendar";

export const ACTIVE_SOURCE = {name:"Government Lottery Office (GLO)",resourceId:"64b39af8-fd9a-4eab-87d4-9193768c3812",endpoint:"https://www.glo.or.th/api/checking/getLotteryResult"} as const;

export function dataFreshness(dataCutoff: string | null | undefined, now = new Date(), lastSuccessfulSync?: string | null) {
  const expectedDrawDate = latestDueDrawDate(now);
  const isStale = !dataCutoff || (expectedDrawDate !== null && dataCutoff < expectedDrawDate);
  const syncTimestamp = Date.parse(lastSuccessfulSync ?? "");
  const ageHours = Number.isFinite(syncTimestamp) ? Math.max(0, (now.getTime() - syncTimestamp) / 3_600_000) : null;
  return {state: isStale ? "stale_data" as const : "fresh" as const, isStale, ageHours, expectedDrawDate};
}

export function publicDataMetadata(input: {dataCutoff: string | null; lastSuccessfulSync: string | null; now?: Date}) {
  return {dataCutoff: input.dataCutoff, lastSuccessfulSync: input.lastSuccessfulSync, source: ACTIVE_SOURCE, freshness: dataFreshness(input.dataCutoff, input.now, input.lastSuccessfulSync)};
}
