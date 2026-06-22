import { MATCH_OUTCOMES, type MatchOutcome, type OutcomeProbabilities } from "./types";

/** Clamp a number into the inclusive [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Renormalize a (possibly unnormalized) distribution so it sums to 1. */
export function normalizeProbabilities(p: OutcomeProbabilities): OutcomeProbabilities {
  const home = Math.max(0, p.home);
  const draw = Math.max(0, p.draw);
  const away = Math.max(0, p.away);
  const total = home + draw + away;
  if (total <= 0) return { home: 1 / 3, draw: 1 / 3, away: 1 / 3 };
  return { home: home / total, draw: draw / total, away: away / total };
}

/**
 * Linearly blend a model distribution with the market distribution.
 * `marketWeight` of 0 trusts the model entirely; 1 trusts the market entirely.
 */
export function blendProbabilities(
  model: OutcomeProbabilities,
  market: OutcomeProbabilities,
  marketWeight: number
): OutcomeProbabilities {
  const w = clamp(marketWeight, 0, 1);
  return normalizeProbabilities({
    home: model.home * (1 - w) + market.home * w,
    draw: model.draw * (1 - w) + market.draw * w,
    away: model.away * (1 - w) + market.away * w,
  });
}

/**
 * Apply a temperature to sharpen (<1) or flatten (>1) a distribution.
 * Implemented as p_i^(1/T) renormalized.
 */
export function applyTemperature(
  p: OutcomeProbabilities,
  temperature: number
): OutcomeProbabilities {
  const t = temperature > 0 ? temperature : 1;
  if (t === 1) return normalizeProbabilities(p);
  const exp = 1 / t;
  return normalizeProbabilities({
    home: p.home ** exp,
    draw: p.draw ** exp,
    away: p.away ** exp,
  });
}

export function probabilityOf(
  p: OutcomeProbabilities,
  outcome: MatchOutcome
): number {
  if (outcome === "HOME") return p.home;
  if (outcome === "DRAW") return p.draw;
  return p.away;
}

/** The outcome carrying the most probability mass. */
export function argmaxOutcome(p: OutcomeProbabilities): MatchOutcome {
  let best: MatchOutcome = "HOME";
  let bestValue = -Infinity;
  for (const outcome of MATCH_OUTCOMES) {
    const value = probabilityOf(p, outcome);
    if (value > bestValue) {
      bestValue = value;
      best = outcome;
    }
  }
  return best;
}
