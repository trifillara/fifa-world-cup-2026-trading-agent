import {
  GammaEvent,
  GammaMarket,
  getMarketBySlug,
  listEventsByTag,
  parseJsonArray,
  searchEvents,
} from "../integrations/gamma";
import { resolveOutcome } from "../ai/outcome";
import type { MarketPrices, MatchContext } from "../ai/types";
import type { ActivityEvent, WorldCupMatch } from "../types";

const WORLD_CUP_HINTS = [
  "world cup",
  "fifa",
  "2026",
  "wc 2026",
  "fifa world cup",
];

export function isWorldCupText(text: string): boolean {
  const lower = text.toLowerCase();
  return WORLD_CUP_HINTS.some((hint) => lower.includes(hint));
}

export function isWorldCupEvent(event: ActivityEvent): boolean {
  const blob = [
    event.title,
    event.slug,
    event.eventSlug,
  ]
    .filter(Boolean)
    .join(" ");
  return isWorldCupText(blob);
}

export function extractTeams(title: string): { home: string; away: string } {
  const vs = title.split(/\s+vs\.?\s+/i);
  if (vs.length >= 2) {
    return { home: vs[0].trim(), away: vs[1].trim() };
  }
  const dash = title.split(/\s+-\s+/);
  if (dash.length >= 2) {
    return { home: dash[0].trim(), away: dash[1].trim() };
  }
  return { home: title.trim(), away: "TBD" };
}

/** Build a model match context from a fixture title (World Cup = neutral). */
export function matchContextFromTitle(title: string): MatchContext {
  const { home, away } = extractTeams(title);
  return { homeTeam: home, awayTeam: away, neutralVenue: true };
}

/** Map a Gamma market's outcome prices onto canonical HOME/DRAW/AWAY prices. */
export function marketPricesFor(
  market: GammaMarket,
  ctx: MatchContext
): MarketPrices {
  const outcomes = parseJsonArray<string>(market.outcomes);
  const prices = parseJsonArray<string>(market.outcomePrices);
  const result: MarketPrices = {};

  outcomes.forEach((outcome, i) => {
    const resolved = resolveOutcome(outcome, ctx);
    const price = Number(prices[i]);
    if (!resolved || !Number.isFinite(price)) return;
    if (resolved === "HOME") result.home = price;
    else if (resolved === "DRAW") result.draw = price;
    else result.away = price;
  });

  return result;
}

/** Fetch live HOME/DRAW/AWAY prices for a fixture by market slug. */
export async function getMatchPrices(
  slug: string,
  ctx: MatchContext
): Promise<MarketPrices> {
  const market = await getMarketBySlug(slug);
  return marketPricesFor(market, ctx);
}

function marketToMatch(event: GammaEvent, market: GammaMarket): WorldCupMatch | null {
  const outcomes = parseJsonArray<string>(market.outcomes);
  const tokenIds = parseJsonArray<string>(market.clobTokenIds);
  if (!outcomes.length || !tokenIds.length) return null;

  const drawIndex = outcomes.findIndex((o) => /^draw$/i.test(o.trim()));
  if (drawIndex < 0 || !tokenIds[drawIndex]) return null;

  const { home, away } = extractTeams(market.question || event.title);

  return {
    eventId: event.id,
    title: event.title || market.question,
    slug: event.slug || market.slug,
    homeTeam: home,
    awayTeam: away,
    drawTokenId: tokenIds[drawIndex],
    drawOutcome: outcomes[drawIndex],
    conditionId: market.conditionId,
    negRisk: Boolean(market.negRisk),
    tickSize: (market.orderPriceMinTickSize ?? 0.01).toFixed(2),
  };
}

export async function fetchWorldCupMatches(): Promise<WorldCupMatch[]> {
  const seen = new Set<string>();
  const matches: WorldCupMatch[] = [];

  const addFromEvents = (events: GammaEvent[]) => {
    for (const event of events) {
      const markets = event.markets ?? [];
      for (const market of markets) {
        if (!market.active || market.closed) continue;
        const match = marketToMatch(event, market);
        if (!match || seen.has(match.conditionId)) continue;
        seen.add(match.conditionId);
        matches.push(match);
      }
    }
  };

  try {
    const tagged = await listEventsByTag("soccer", 80);
    addFromEvents(tagged.filter((e) => isWorldCupText(e.title ?? e.slug ?? "")));
  } catch {
    // tag may not exist — fall through to search
  }

  for (const query of ["FIFA 2026", "World Cup 2026", "2026 World Cup"]) {
    try {
      const events = await searchEvents(query, 30);
      addFromEvents(events);
    } catch {
      // continue
    }
  }

  return matches.sort((a, b) => a.title.localeCompare(b.title));
}
