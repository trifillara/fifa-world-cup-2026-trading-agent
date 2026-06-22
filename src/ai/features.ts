import { effectiveHomeElo, expectedScore } from "./elo";
import { getTeamRating, hasRating, type TeamRating } from "./ratings";
import type { MatchContext } from "./types";

/**
 * Numeric features derived from a fixture, feeding the statistical model.
 *
 * Expected goals (lambda) blend two views:
 *  - each side's own attack vs. the opponent's defense, and
 *  - an Elo tilt that nudges the favourite's lambda up and the underdog's down.
 */
export interface MatchFeatures {
  home: TeamRating;
  away: TeamRating;
  homeElo: number;
  awayElo: number;
  eloDiff: number;
  homeWinExpectancy: number;
  lambdaHome: number;
  lambdaAway: number;
  /** True when both teams are in the ratings table (higher trust). */
  bothRated: boolean;
}

/** League-average goals per side; anchors the attack/defense interaction. */
const BASELINE_GOALS = 1.35;

/** How strongly the Elo gap skews expected goals (per unit win expectancy). */
const ELO_GOAL_TILT = 0.9;

export function buildFeatures(ctx: MatchContext): MatchFeatures {
  const home = getTeamRating(ctx.homeTeam);
  const away = getTeamRating(ctx.awayTeam);

  const homeElo = effectiveHomeElo(home.elo, ctx.neutralVenue);
  const awayElo = away.elo;
  const homeWinExpectancy = expectedScore(homeElo, awayElo);

  // Attack/defense interaction relative to a league-average opponent.
  const homeBase = (home.attack * away.defense) / BASELINE_GOALS;
  const awayBase = (away.attack * home.defense) / BASELINE_GOALS;

  // Elo tilt centred on 0.5 expectancy, scaled into a goal adjustment.
  const tilt = (homeWinExpectancy - 0.5) * ELO_GOAL_TILT;
  const lambdaHome = Math.max(0.15, homeBase + tilt);
  const lambdaAway = Math.max(0.15, awayBase - tilt);

  return {
    home,
    away,
    homeElo,
    awayElo,
    eloDiff: homeElo - awayElo,
    homeWinExpectancy,
    lambdaHome,
    lambdaAway,
    bothRated: hasRating(ctx.homeTeam) && hasRating(ctx.awayTeam),
  };
}
