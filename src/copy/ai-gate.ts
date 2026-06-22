import { AiAgent } from "../ai/agent";
import type { AiAgentConfig } from "../ai/config";
import type { ActivityEvent, AiSettings, BotSettings } from "../types";
import { getMatchPrices, matchContextFromTitle } from "../worldcup/markets";

/** Adapt the persisted AI settings to the agent's runtime config shape. */
export function toAgentConfig(ai: AiSettings): AiAgentConfig {
  return {
    enabled: ai.enabled,
    provider: ai.provider,
    gateCopyTrades: ai.gateCopyTrades,
    minEdge: ai.minEdge,
    minConfidence: ai.minConfidence,
    maxStakeUsd: ai.maxStakeUsd,
    kellyFraction: ai.kellyFraction,
    bankrollUsd: ai.bankrollUsd,
    blendMarketWeight: ai.blendMarketWeight,
    temperature: ai.temperature,
  };
}

export function createAgent(settings: BotSettings): AiAgent {
  return new AiAgent(toAgentConfig(settings.ai));
}

export interface GateResult {
  approved: boolean;
  reason: string;
}

/**
 * Ask the agent whether a leader's copied trade has model support.
 *
 * Fails open: any missing data, unresolved outcome, or network error returns
 * `approved: true` so the AI layer can only ever subtract risk, never strand
 * the copy engine.
 */
export async function gateCopyTrade(
  agent: AiAgent,
  event: ActivityEvent
): Promise<GateResult> {
  if (!agent.enabled || !agent.settings.gateCopyTrades) {
    return { approved: true, reason: "gate off" };
  }

  const title = event.title ?? "";
  if (!title) return { approved: true, reason: "no title to analyse" };

  const ctx = matchContextFromTitle(title);

  try {
    const prices = event.slug ? await getMatchPrices(event.slug, ctx) : {};
    const decision = await agent.approveCopy(ctx, prices, event.outcome);
    return { approved: decision.approved, reason: decision.reason };
  } catch (error) {
    return { approved: true, reason: `ai gate error (allowed): ${String(error)}` };
  }
}
