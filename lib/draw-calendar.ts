const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DRAW_PUBLICATION_DEADLINE = "21:00:00+07:00";

// GLO's recurring holidays: https://www.glo.or.th/service/faq/award
// Key exceptional dates by the original 1st/16th slot. Add announced
// exceptions here so sync, freshness, and prediction targets agree.
export const DRAW_DATE_OVERRIDES: Readonly<Record<string, string>> = {
  "2018-03-01": "2018-03-02",
  "2019-07-16": "2019-07-15",
  "2022-02-16": "2022-02-17",
  "2023-08-01": "2023-07-31",
  // Official notices supersede the recurring New Year rule for this year.
  "2026-12-16": "2026-12-17",
  "2027-01-01": "2027-01-02",
};

export function bangkokClock(now: Date) {
  return new Date(now.getTime() + BANGKOK_OFFSET_MS);
}

export function bangkokDate(now = new Date()) {
  return bangkokClock(now).toISOString().slice(0, 10);
}

function dateKey(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

function datesAround(date: string) {
  const [year, month] = date.split("-").map(Number);
  return Array.from({length: 5}, (_, index) => {
    const slot = new Date(Date.UTC(year, month - 3 + index, 1));
    const y = slot.getUTCFullYear(), m = slot.getUTCMonth();
    const first = dateKey(y, m, 1), middle = dateKey(y, m, 16);
    return [
      DRAW_DATE_OVERRIDES[first] ?? (m === 0 ? dateKey(y - 1, 11, 30) : m === 4 ? dateKey(y, m, 2) : first),
      DRAW_DATE_OVERRIDES[middle] ?? (m === 0 ? dateKey(y, m, 17) : middle),
    ];
  }).flat().sort();
}

export function isExpectedDrawDate(date: string) {
  return datesAround(date).includes(date);
}

export function nextDrawDate(after: string) {
  return datesAround(after).find(date => date > after) ?? null;
}

export function latestDueDrawDate(now: Date) {
  return datesAround(bangkokDate(now)).findLast(date =>
    now.getTime() >= Date.parse(`${date}T${DRAW_PUBLICATION_DEADLINE}`),
  ) ?? null;
}
