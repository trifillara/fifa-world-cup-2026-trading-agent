import type { AiAgent } from "../ai/agent";
import { outcomeLabel } from "../ai/outcome";
import type { MatchContext, TradeSignal } from "../ai/types";
import { pulse } from "../cli/terminal";
import type { WorldCupMatch } from "../types";
import {
  fetchWorldCupMatches,
  matchContextFromTitle,
  resolveMatchMarket,
  type ResolvedMatchMarket,
} from "./markets";

export interface ValueOpportunity {
  match: WorldCupMatch;
  ctx: MatchContext;
  market: ResolvedMatchMarket;
  signal: TradeSignal;
  pick: string;
}

/**
 * Evaluate every open World Cup fixture with the AI agent and return the
 * actionable BUY signals, ranked by edge. This is the brain behind the
 * autonomous value-trading mode.
 */
export async function scanValueOpportunities(
  agent: AiAgent,
  limit = 40
): Promise<ValueOpportunity[]> {
  const matches = await fetchWorldCupMatches();
  if (!matches.length) {
    pulse.warn("ai", "no World Cup markets to scan yet");
    return [];
  }

  pulse.info("ai", `scanning ${Math.min(matches.length, limit)} fixtures with ${agent.modelName}…`);

  const opportunities: ValueOpportunity[] = [];
  for (const match of matches.slice(0, limit)) {
    const ctx = matchContextFromTitle(match.title);
    try {
      const market = await resolveMatchMarket(match.slug, ctx);
      const signal = await agent.evaluate(ctx, market.prices);
      if (signal && signal.act) {
        opportunities.push({
          match,
          ctx,
          market,
          signal,
          pick: outcomeLabel(signal.outcome, ctx),
        });
      }
    } catch (error) {
      pulse.dim(`scan skip ${match.title.slice(0, 40)} — ${String(error)}`);
    }
  }

  opportunities.sort((a, b) => b.signal.edge - a.signal.edge);
  return opportunities;
}
