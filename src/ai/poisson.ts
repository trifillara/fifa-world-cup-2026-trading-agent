import type { OutcomeProbabilities } from "./types";

/**
 * Poisson scoreline model.
 *
 * Treats each side's goals as an independent Poisson variable parameterised by
 * its expected goals (lambda). Summing the joint scoreline grid yields the
 * probabilities of a home win, draw, or away win.
 */

function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i += 1) result *= i;
  return result;
}

/** Probability of exactly `k` events for a Poisson(lambda) variable. */
export function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.exp(-lambda) * lambda ** k) / factorial(k);
}

/**
 * Convert expected goals for each side into a 1X2 distribution.
 * `maxGoals` bounds the scoreline grid; 8 captures > 99.9% of realistic mass.
 */
export function scorelineProbabilities(
  lambdaHome: number,
  lambdaAway: number,
  maxGoals = 8
): OutcomeProbabilities {
  let home = 0;
  let draw = 0;
  let away = 0;

  const homePmf: number[] = [];
  const awayPmf: number[] = [];
  for (let g = 0; g <= maxGoals; g += 1) {
    homePmf[g] = poissonPmf(g, lambdaHome);
    awayPmf[g] = poissonPmf(g, lambdaAway);
  }

  for (let h = 0; h <= maxGoals; h += 1) {
    for (let a = 0; a <= maxGoals; a += 1) {
      const p = homePmf[h] * awayPmf[a];
      if (h > a) home += p;
      else if (h === a) draw += p;
      else away += p;
    }
  }

  const total = home + draw + away;
  if (total <= 0) return { home: 1 / 3, draw: 1 / 3, away: 1 / 3 };
  return { home: home / total, draw: draw / total, away: away / total };
}

/** Most likely exact scoreline under the Poisson grid (for color/commentary). */
export function topScoreline(
  lambdaHome: number,
  lambdaAway: number,
  maxGoals = 6
): { home: number; away: number; probability: number } {
  let best = { home: 0, away: 0, probability: 0 };
  for (let h = 0; h <= maxGoals; h += 1) {
    for (let a = 0; a <= maxGoals; a += 1) {
      const p = poissonPmf(h, lambdaHome) * poissonPmf(a, lambdaAway);
      if (p > best.probability) best = { home: h, away: a, probability: p };
    }
  }
  return best;
}
