import { normalizeTeam } from "./ratings";
import type { MatchContext, MatchOutcome } from "./types";

/**
 * Map a free-text outcome label (as it appears on a Polymarket trade or token,
 * e.g. "Draw", "Argentina", "France") onto a canonical 1X2 outcome relative to
 * a fixture. Returns null when the label cannot be confidently resolved.
 */
export function resolveOutcome(
  label: string | undefined,
  ctx: MatchContext
): MatchOutcome | null {
  if (!label) return null;
  const value = normalizeTeam(label);

  if (value === "draw" || value === "tie" || value === "x") return "DRAW";

  const home = normalizeTeam(ctx.homeTeam);
  const away = normalizeTeam(ctx.awayTeam);

  if (value === home) return "HOME";
  if (value === away) return "AWAY";

  // Partial containment handles "Argentina win", "Win - France", etc.
  if (home && value.includes(home)) return "HOME";
  if (away && value.includes(away)) return "AWAY";

  return null;
}

export function outcomeLabel(outcome: MatchOutcome, ctx: MatchContext): string {
  if (outcome === "HOME") return ctx.homeTeam;
  if (outcome === "AWAY") return ctx.awayTeam;
  return "Draw";
}
