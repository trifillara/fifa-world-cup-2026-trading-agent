const GAMMA = "https://gamma-api.polymarket.com";

export interface GammaMarket {
  id: string;
  question: string;
  slug: string;
  conditionId: string;
  clobTokenIds: string;
  outcomes: string;
  outcomePrices: string;
  negRisk?: boolean;
  orderPriceMinTickSize?: number;
  active?: boolean;
  closed?: boolean;
  events?: Array<{ id: string; slug: string; title: string }>;
}

export interface GammaEvent {
  id: string;
  title: string;
  slug: string;
  markets?: GammaMarket[];
  active?: boolean;
  closed?: boolean;
}

export async function searchEvents(query: string, limit = 20): Promise<GammaEvent[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    active: "true",
    closed: "false",
  });
  const response = await fetch(`${GAMMA}/public-search?${params}`);
  if (!response.ok) {
    throw new Error(`Gamma search failed: ${response.status}`);
  }
  const data = (await response.json()) as { events?: GammaEvent[] };
  return data.events ?? [];
}

export async function listEventsByTag(tagSlug: string, limit = 50): Promise<GammaEvent[]> {
  const params = new URLSearchParams({
    tag_slug: tagSlug,
    limit: String(limit),
    active: "true",
    closed: "false",
  });
  const response = await fetch(`${GAMMA}/events?${params}`);
  if (!response.ok) {
    throw new Error(`Gamma events failed: ${response.status}`);
  }
  return (await response.json()) as GammaEvent[];
}

export async function getEventBySlug(slug: string): Promise<GammaEvent> {
  const response = await fetch(`${GAMMA}/events/slug/${encodeURIComponent(slug)}`);
  if (!response.ok) {
    throw new Error(`Event not found: ${slug}`);
  }
  return (await response.json()) as GammaEvent;
}

export async function getMarketBySlug(slug: string): Promise<GammaMarket> {
  const response = await fetch(`${GAMMA}/markets/slug/${encodeURIComponent(slug)}`);
  if (!response.ok) {
    throw new Error(`Market not found: ${slug}`);
  }
  return (await response.json()) as GammaMarket;
}

export function parseJsonArray<T>(raw: string | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
