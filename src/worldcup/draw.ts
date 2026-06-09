import { getMarketPrice, placeMarketBuyUsd } from "../integrations/clob";
import { pulse } from "../cli/terminal";
import { getSettings } from "../config/settings";
import type { WorldCupMatch } from "../types";
import { fetchWorldCupMatches } from "./markets";

export async function listDrawOpportunities(): Promise<WorldCupMatch[]> {
  pulse.info("draw", "loading FIFA 2026 match markets…");
  const matches = await fetchWorldCupMatches();
  if (!matches.length) {
    pulse.warn("draw", "no World Cup draw markets found — try again closer to kickoff");
  }
  return matches;
}

export async function buyDrawToken(
  match: WorldCupMatch,
  usd: number,
  dryRun: boolean
): Promise<void> {
  const settings = getSettings();
  const ask = await getMarketPrice(match.drawTokenId, "BUY");
  const slippage = settings.drawMaxSlippageCents / 100;

  pulse.info(
    "draw",
    `${match.homeTeam} vs ${match.awayTeam} · Draw @ ${ask.toFixed(3)} · $${usd.toFixed(2)}`
  );

  if (ask <= 0) {
    throw new Error("No ask price available for draw token.");
  }

  if (ask + slippage >= 0.99) {
    pulse.warn("draw", "draw price very high — confirm you still want this trade");
  }

  await placeMarketBuyUsd(
    match.drawTokenId,
    usd,
    match.tickSize,
    match.negRisk,
    dryRun
  );

  pulse.ok("draw", `Draw order submitted for ${match.homeTeam} vs ${match.awayTeam}`);
}
