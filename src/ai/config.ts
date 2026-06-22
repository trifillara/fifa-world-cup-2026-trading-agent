/**
 * Configuration for the AI trading agent and sane defaults.
 *
 * These values are merged from `config/bot.toml` ([ai] section) and the
 * environment, then handed to the agent at construction time.
 */

export type AiProvider = "local" | "llm";

export interface AiAgentConfig {
  /** Master switch — when false the agent is inert and never vetoes trades. */
  enabled: boolean;
  /** Which model backs the agent. */
  provider: AiProvider;
  /** Minimum (modelProb - marketProb) edge before a signal is actionable. */
  minEdge: number;
  /** Minimum model confidence before a signal is actionable. */
  minConfidence: number;
  /** Hard cap on a single autonomous stake, in USD. */
  maxStakeUsd: number;
  /** Fraction of full Kelly to stake (0.25 = quarter-Kelly). */
  kellyFraction: number;
  /** Bankroll the Kelly sizing budgets against, in USD. */
  bankrollUsd: number;
  /** Weight given to market-implied probabilities when blending (0..1). */
  blendMarketWeight: number;
  /** Softmax-style temperature applied to model probabilities (>0). */
  temperature: number;
  /** When true, the agent must approve a leader trade before it is copied. */
  gateCopyTrades: boolean;
}

export const DEFAULT_AI_CONFIG: AiAgentConfig = {
  enabled: false,
  provider: "local",
  minEdge: 0.05,
  minConfidence: 0.55,
  maxStakeUsd: 25,
  kellyFraction: 0.25,
  bankrollUsd: 500,
  blendMarketWeight: 0.4,
  temperature: 1,
  gateCopyTrades: false,
};

export function resolveAiProvider(value: string | undefined): AiProvider {
  return value === "llm" ? "llm" : "local";
}
