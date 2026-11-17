export type Draw = {
  drawDate: string;
  firstPrize: string;
  front31: string;
  front32: string;
  last31: string;
  last32: string;
  last2: string;
};
export type Results = {
  status: 'ready' | 'stale_data' | 'sync_pending';
  results: Draw[];
};
export type TicketResult = {
  verificationStatus?: string;
  drawDate: string;
  isWinner: boolean | null;
  matchedPrizes: { category: string; matchedNumber: string }[];
};

const origin = process.env.EXPO_PUBLIC_API_ORIGIN?.replace(/\/+$/, '');

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!origin || !/^https:\/\/[^/]+$/.test(origin)) {
    throw new Error('The HTTPS results server has not been configured.');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(origin + path, { ...init, signal: controller.signal });
    if (!response.ok) {
      if (response.status === 404) throw new Error('Verified prize data is not available for this draw.');
      if (response.status === 429) throw new Error('Too many checks. Try again shortly.');
      throw new Error('Results are temporarily unavailable.');
    }
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const loadResults = () => request<Results>('/api/results');
export async function checkTicket(ticket: string, date?: string) {
  const payload = await request<{ result: TicketResult }>('/api/check', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ticket, ...(date ? { date } : {}) }),
  });
  const result = payload.result;
  return { ...result, isWinner: result.isWinner === false && result.verificationStatus !== "FULL_PRIZE_SET_VERIFIED" ? null : result.isWinner };
}
