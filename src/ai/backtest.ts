import { AiAgent } from "./agent";
import { DEFAULT_AI_CONFIG, type AiAgentConfig } from "./config";
import type { Model } from "./model";
import { probabilityOf } from "./probability";
import type { MarketPrices, MatchOutcome } from "./types";

/** A settled fixture with its closing market prices, for offline evaluation. */
export interface BacktestFixture {
  homeTeam: string;
  awayTeam: string;
  neutralVenue?: boolean;
  prices: MarketPrices;
  result: MatchOutcome;
}

export interface BacktestReport {
  fixtures: number;
  bets: number;
  wins: number;
  hitRate: number;
  staked: number;
  returned: number;
  profit: number;
  roi: number;
  /** Mean Brier score of the model's full distribution (lower is better). */
  brier: number;
  /** Mean log loss of the model's full distribution (lower is better). */
  logLoss: number;
}

function priceFor(prices: MarketPrices, outcome: MatchOutcome): number | undefined {
  if (outcome === "HOME") return prices.home;
  if (outcome === "DRAW") return prices.draw;
  return prices.away;
}

/**
 * Replay the agent over settled fixtures.
 *
 * For every fixture we take the agent's actionable signal (if any), stake it at
 * the recorded price, and settle against the true result. We also score the raw
 * probability distribution with Brier and log loss to track calibration
 * independently of the betting P&L.
 */
export async function runBacktest(
  fixtures: BacktestFixture[],
  config: AiAgentConfig = { ...DEFAULT_AI_CONFIG, enabled: true },
  model?: Model
): Promise<BacktestReport> {
  const agent = new AiAgent(config, model, 0);

  let bets = 0;
  let wins = 0;
  let staked = 0;
  let returned = 0;
  let brierSum = 0;
  let logLossSum = 0;

  for (const fixture of fixtures) {
    const ctx = {
      homeTeam: fixture.homeTeam,
      awayTeam: fixture.awayTeam,
      neutralVenue: fixture.neutralVenue,
    };

    const analysis = await agent.analyzeMatch(ctx, fixture.prices);
    brierSum += brierScore(analysis.probabilities, fixture.result);
    logLossSum += logLoss(probabilityOf(analysis.probabilities, fixture.result));

    const signal = await agent.evaluate(ctx, fixture.prices);
    if (!signal || !signal.act) continue;

    const price = priceFor(fixture.prices, signal.outcome);
    if (typeof price !== "number" || price <= 0 || price >= 1) continue;

    bets += 1;
    staked += signal.stakeUsd;
    const shares = signal.stakeUsd / price;
    if (signal.outcome === fixture.result) {
      wins += 1;
      returned += shares; // each winning share redeems for $1
    }
  }

  const profit = returned - staked;
  return {
    fixtures: fixtures.length,
    bets,
    wins,
    hitRate: bets > 0 ? wins / bets : 0,
    staked,
    returned,
    profit,
    roi: staked > 0 ? profit / staked : 0,
    brier: fixtures.length > 0 ? brierSum / fixtures.length : 0,
    logLoss: fixtures.length > 0 ? logLossSum / fixtures.length : 0,
  };
}

function brierScore(
  probs: { home: number; draw: number; away: number },
  result: MatchOutcome
): number {
  const target = {
    home: result === "HOME" ? 1 : 0,
    draw: result === "DRAW" ? 1 : 0,
    away: result === "AWAY" ? 1 : 0,
  };
  return (
    (probs.home - target.home) ** 2 +
    (probs.draw - target.draw) ** 2 +
    (probs.away - target.away) ** 2
  );
}

function logLoss(probabilityOfActual: number): number {
  const p = Math.min(1, Math.max(1e-9, probabilityOfActual));
  return -Math.log(p);
}
