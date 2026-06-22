import type { AiAgentConfig } from "./config";
import { kellyFraction, stakeFromKelly } from "./kelly";
import { impliedProbabilities } from "./market-implied";
import { probabilityOf } from "./probability";
import {
  MATCH_OUTCOMES,
  type EdgeAssessment,
  type MarketPrices,
  type MatchOutcome,
  type ModelAnalysis,
  type OutcomeProbabilities,
  type TradeSignal,
} from "./types";

function priceFor(prices: MarketPrices, outcome: MatchOutcome): number | undefined {
  if (outcome === "HOME") return prices.home;
  if (outcome === "DRAW") return prices.draw;
  return prices.away;
}

/**
 * Compare model probabilities against the market for every outcome.
 *
 * `edge` is model minus market probability; `expectedValue` is the EV per $1
 * staked when buying the outcome token at its current price (prob/price - 1).
 */
export function assessEdges(
  model: OutcomeProbabilities,
  prices: MarketPrices
): EdgeAssessment[] {
  const implied = impliedProbabilities(prices);
  const assessments: EdgeAssessment[] = [];

  for (const outcome of MATCH_OUTCOMES) {
    const price = priceFor(prices, outcome);
    if (typeof price !== "number" || price <= 0 || price >= 1) continue;

    const modelProbability = probabilityOf(model, outcome);
    const marketProbability = implied
      ? probabilityOf(implied, outcome)
      : price;
    const expectedValue = modelProbability / price - 1;

    assessments.push({
      outcome,
      modelProbability,
      marketProbability,
      edge: modelProbability - marketProbability,
      expectedValue,
      marketPrice: price,
    });
  }

  return assessments;
}

/** The assessment with the largest positive edge, if any. */
export function bestEdge(assessments: EdgeAssessment[]): EdgeAssessment | null {
  let best: EdgeAssessment | null = null;
  for (const a of assessments) {
    if (a.edge <= 0) continue;
    if (!best || a.edge > best.edge) best = a;
  }
  return best;
}

/**
 * Build a concrete, sized BUY signal from an analysis and live prices.
 * Returns null when no outcome shows positive edge.
 */
export function buildSignal(
  analysis: ModelAnalysis,
  prices: MarketPrices,
  config: AiAgentConfig
): TradeSignal | null {
  const assessments = assessEdges(analysis.probabilities, prices);
  const top = bestEdge(assessments);
  if (!top) return null;

  const fullKelly = kellyFraction(top.modelProbability, top.marketPrice);
  const stakeUsd = stakeFromKelly(
    config.bankrollUsd,
    fullKelly,
    config.kellyFraction,
    config.maxStakeUsd
  );

  const act =
    top.edge >= config.minEdge &&
    analysis.confidence >= config.minConfidence &&
    stakeUsd > 0;

  return {
    outcome: top.outcome,
    side: "BUY",
    edge: top.edge,
    expectedValue: top.expectedValue,
    confidence: analysis.confidence,
    stakeUsd,
    kellyFraction: fullKelly,
    marketPrice: top.marketPrice,
    rationale: analysis.rationale,
    act,
  };
}
