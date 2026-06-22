/**
 * Core AI domain types.
 *
 * The agent reasons about football match markets as a 1X2 (three-way) market:
 * HOME win, DRAW, or AWAY win. Polymarket exposes each outcome as its own
 * binary token priced in [0, 1], which doubles as an implied probability.
 */

export type MatchOutcome = "HOME" | "DRAW" | "AWAY";

export const MATCH_OUTCOMES: readonly MatchOutcome[] = ["HOME", "DRAW", "AWAY"];

/** A normalized probability distribution over the three match outcomes. */
export interface OutcomeProbabilities {
  home: number;
  draw: number;
  away: number;
}

/** Everything the model needs to reason about a fixture. */
export interface MatchContext {
  homeTeam: string;
  awayTeam: string;
  /** ISO kickoff timestamp, when known. */
  kickoff?: string;
  /** World Cup matches are mostly on neutral ground — disables home edge. */
  neutralVenue?: boolean;
  /** Free-form note surfaced to the LLM provider (group, stakes, injuries…). */
  note?: string;
}

/** Live market prices for each outcome token (each already in [0, 1]). */
export interface MarketPrices {
  home?: number;
  draw?: number;
  away?: number;
}

/** Output of a single model evaluation for a fixture. */
export interface ModelAnalysis {
  probabilities: OutcomeProbabilities;
  /** Model self-reported confidence in its estimate, in [0, 1]. */
  confidence: number;
  /** Human-readable explanation of the call. */
  rationale: string;
  /** Identifier of the model that produced this analysis. */
  source: string;
}

/** Per-outcome comparison of model belief against the market. */
export interface EdgeAssessment {
  outcome: MatchOutcome;
  modelProbability: number;
  marketProbability: number;
  /** modelProbability - marketProbability. */
  edge: number;
  /** Expected value per $1 staked when buying at marketPrice. */
  expectedValue: number;
  marketPrice: number;
}

/** A concrete, actionable recommendation for a single outcome token. */
export interface TradeSignal {
  outcome: MatchOutcome;
  side: "BUY";
  edge: number;
  expectedValue: number;
  confidence: number;
  /** Recommended stake in USD after sizing + caps. */
  stakeUsd: number;
  /** Raw fractional Kelly stake (fraction of bankroll). */
  kellyFraction: number;
  marketPrice: number;
  rationale: string;
  /** Whether the signal clears the configured action thresholds. */
  act: boolean;
}
