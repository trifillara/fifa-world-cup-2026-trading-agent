import type { ActivityEvent } from "../types";

const DATA_API = "https://data-api.polymarket.com";

export const COPY_ACTIVITY_TYPES = [
  "TRADE",
  "MERGE",
  "SPLIT",
  "REDEEM",
] as const;

export async function fetchUserActivity(
  wallet: string,
  limit: number
): Promise<ActivityEvent[]> {
  const params = new URLSearchParams({
    user: wallet,
    limit: String(limit),
    sortBy: "TIMESTAMP",
    sortDirection: "DESC",
    type: COPY_ACTIVITY_TYPES.join(","),
  });

  const response = await fetch(`${DATA_API}/activity?${params}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`activity API ${response.status}: ${text.slice(0, 200)}`);
  }

  const data = (await response.json()) as ActivityEvent[] | unknown;
  if (!Array.isArray(data)) return [];
  return [...data].reverse();
}

export async function fetchLeaderboard(
  limit = 20,
  timePeriod: "DAY" | "WEEK" | "MONTH" | "ALL" = "MONTH"
): Promise<Array<{ rank: string; proxyWallet: string; userName: string; vol: number; pnl: number }>> {
  const params = new URLSearchParams({
    limit: String(limit),
    timePeriod,
    orderBy: "PNL",
  });
  const response = await fetch(`${DATA_API}/v1/leaderboard?${params}`);
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as Array<{
    rank: string;
    proxyWallet: string;
    userName: string;
    vol: number;
    pnl: number;
  }>;
  return Array.isArray(data) ? data : [];
}
