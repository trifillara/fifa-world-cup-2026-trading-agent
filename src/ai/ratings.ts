/**
 * Baseline strength ratings for likely FIFA World Cup 2026 contenders.
 *
 * `elo`     — overall strength on the Elo scale (used for win expectancy).
 * `attack`  — expected goals scored vs. an average opponent.
 * `defense` — expected goals conceded vs. an average opponent.
 *
 * Numbers are approximate, hand-tuned priors meant to be refined over time
 * (e.g. by `updateElo` after results) rather than authoritative truth.
 */

export interface TeamRating {
  team: string;
  elo: number;
  attack: number;
  defense: number;
}

/** Strength of a generic unseeded / unknown national side. */
export const DEFAULT_RATING: Omit<TeamRating, "team"> = {
  elo: 1700,
  attack: 1.15,
  defense: 1.3,
};

const RATINGS: Record<string, TeamRating> = {
  argentina: { team: "Argentina", elo: 2140, attack: 2.1, defense: 0.75 },
  france: { team: "France", elo: 2120, attack: 2.2, defense: 0.85 },
  spain: { team: "Spain", elo: 2095, attack: 2.15, defense: 0.9 },
  england: { team: "England", elo: 2060, attack: 1.95, defense: 0.9 },
  brazil: { team: "Brazil", elo: 2055, attack: 2.0, defense: 0.95 },
  portugal: { team: "Portugal", elo: 2030, attack: 2.05, defense: 1.0 },
  netherlands: { team: "Netherlands", elo: 2000, attack: 1.9, defense: 1.0 },
  belgium: { team: "Belgium", elo: 1965, attack: 1.85, defense: 1.05 },
  germany: { team: "Germany", elo: 1960, attack: 1.9, defense: 1.1 },
  italy: { team: "Italy", elo: 1955, attack: 1.7, defense: 0.95 },
  croatia: { team: "Croatia", elo: 1910, attack: 1.6, defense: 1.05 },
  uruguay: { team: "Uruguay", elo: 1900, attack: 1.65, defense: 1.0 },
  colombia: { team: "Colombia", elo: 1875, attack: 1.6, defense: 1.05 },
  morocco: { team: "Morocco", elo: 1865, attack: 1.5, defense: 0.95 },
  usa: { team: "USA", elo: 1820, attack: 1.55, defense: 1.15 },
  mexico: { team: "Mexico", elo: 1815, attack: 1.55, defense: 1.15 },
  switzerland: { team: "Switzerland", elo: 1810, attack: 1.5, defense: 1.1 },
  denmark: { team: "Denmark", elo: 1805, attack: 1.55, defense: 1.1 },
  japan: { team: "Japan", elo: 1800, attack: 1.5, defense: 1.05 },
  senegal: { team: "Senegal", elo: 1790, attack: 1.5, defense: 1.1 },
  ecuador: { team: "Ecuador", elo: 1770, attack: 1.45, defense: 1.1 },
  korea: { team: "South Korea", elo: 1760, attack: 1.45, defense: 1.2 },
  "south korea": { team: "South Korea", elo: 1760, attack: 1.45, defense: 1.2 },
  canada: { team: "Canada", elo: 1745, attack: 1.4, defense: 1.2 },
  australia: { team: "Australia", elo: 1730, attack: 1.35, defense: 1.2 },
  poland: { team: "Poland", elo: 1725, attack: 1.4, defense: 1.2 },
  nigeria: { team: "Nigeria", elo: 1720, attack: 1.45, defense: 1.25 },
  ghana: { team: "Ghana", elo: 1695, attack: 1.4, defense: 1.3 },
  "ivory coast": { team: "Ivory Coast", elo: 1690, attack: 1.4, defense: 1.25 },
  egypt: { team: "Egypt", elo: 1685, attack: 1.35, defense: 1.25 },
  "saudi arabia": { team: "Saudi Arabia", elo: 1640, attack: 1.25, defense: 1.35 },
  qatar: { team: "Qatar", elo: 1600, attack: 1.2, defense: 1.4 },
};

export function normalizeTeam(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getTeamRating(name: string): TeamRating {
  const key = normalizeTeam(name);
  const found = RATINGS[key];
  if (found) return found;
  return { team: name.trim() || "Unknown", ...DEFAULT_RATING };
}

export function hasRating(name: string): boolean {
  return normalizeTeam(name) in RATINGS;
}

export function allRatings(): TeamRating[] {
  return Object.values(RATINGS);
}
