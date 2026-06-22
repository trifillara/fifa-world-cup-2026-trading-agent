import { buildFeatures } from "./features";
import { impliedProbabilities } from "./market-implied";
import type { Model } from "./model";
import { scorelineProbabilities, topScoreline } from "./poisson";
import {
  applyTemperature,
  argmaxOutcome,
  blendProbabilities,
} from "./probability";
import type {
  MarketPrices,
  MatchContext,
  ModelAnalysis,
  OutcomeProbabilities,
} from "./types";

/**
 * Offline statistical model — no network, no API key.
 *
 * Pipeline: ratings + Elo -> expected goals -> Poisson 1X2 distribution,
 * optionally blended toward the market, then temperature-adjusted. Confidence
 * reflects both how decisive the distribution is and whether both teams are
 * actually in the ratings table.
 */
export class LocalStatisticalModel implements Model {
  readonly name = "local-statistical";

  constructor(
    private readonly marketWeight = 0.4,
    private readonly temperature = 1
  ) {}

  async analyze(ctx: MatchContext, market: MarketPrices): Promise<ModelAnalysis> {
    const features = buildFeatures(ctx);
    const modelProbs = scorelineProbabilities(
      features.lambdaHome,
      features.lambdaAway
    );

    const implied = impliedProbabilities(market);
    const blended = implied
      ? blendProbabilities(modelProbs, implied, this.marketWeight)
      : modelProbs;
    const probabilities = applyTemperature(blended, this.temperature);

    return {
      probabilities,
      confidence: this.estimateConfidence(probabilities, features.bothRated, implied != null),
      rationale: this.describe(ctx, features, probabilities),
      source: this.name,
    };
  }

  private estimateConfidence(
    probs: OutcomeProbabilities,
    bothRated: boolean,
    hadMarket: boolean
  ): number {
    const leader = Math.max(probs.home, probs.draw, probs.away);
    // Map a 0.33..1 leading probability onto roughly 0.3..0.9.
    const decisiveness = (leader - 1 / 3) / (1 - 1 / 3);
    let confidence = 0.35 + 0.5 * Math.max(0, decisiveness);
    if (bothRated) confidence += 0.08;
    if (hadMarket) confidence += 0.05;
    return Math.min(0.95, Math.max(0.2, confidence));
  }

  private describe(
    ctx: MatchContext,
    features: ReturnType<typeof buildFeatures>,
    probs: OutcomeProbabilities
  ): string {
    const pick = argmaxOutcome(probs);
    const score = topScoreline(features.lambdaHome, features.lambdaAway);
    const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
    const lean =
      pick === "HOME"
        ? ctx.homeTeam
        : pick === "AWAY"
          ? ctx.awayTeam
          : "the draw";
    return (
      `${ctx.homeTeam} vs ${ctx.awayTeam}: leaning ${lean}. ` +
      `xG ${features.lambdaHome.toFixed(2)}-${features.lambdaAway.toFixed(2)}, ` +
      `most likely ${score.home}-${score.away}. ` +
      `P(home)=${pct(probs.home)} P(draw)=${pct(probs.draw)} P(away)=${pct(probs.away)}.`
    );
  }
}
