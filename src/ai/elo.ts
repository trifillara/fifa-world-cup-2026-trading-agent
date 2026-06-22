/**
 * Elo win-expectancy helpers.
 *
 * Elo gives the probability that side A beats side B in a two-way contest.
 * Football has draws, so this expectancy is only a building block — the
 * Poisson model converts it into a full 1X2 distribution downstream.
 */

/** Elo points added to the home side for venue advantage (0 on neutral ground). */
export const HOME_ADVANTAGE_ELO = 65;

/**
 * Probability that a side rated `eloA` beats a side rated `eloB`.
 * Returns a value in (0, 1).
 */
export function expectedScore(eloA: number, eloB: number): number {
  return 1 / (1 + 10 ** ((eloB - eloA) / 400));
}

/**
 * Updated Elo for a side after a match.
 * `actual` is 1 for a win, 0.5 for a draw, 0 for a loss.
 */
export function updateElo(
  elo: number,
  expected: number,
  actual: number,
  k = 30
): number {
  return elo + k * (actual - expected);
}

/** Effective home Elo once venue advantage is applied. */
export function effectiveHomeElo(homeElo: number, neutralVenue = false): number {
  return homeElo + (neutralVenue ? 0 : HOME_ADVANTAGE_ELO);
}
