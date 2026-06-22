import type { BacktestFixture } from "./backtest";

/**
 * A small illustrative set of settled fixtures with plausible closing prices,
 * used to smoke-test the backtest harness and demonstrate calibration metrics.
 * These are synthetic teaching examples, not historical records.
 */
export const SAMPLE_FIXTURES: BacktestFixture[] = [
  {
    homeTeam: "Argentina",
    awayTeam: "Mexico",
    prices: { home: 0.66, draw: 0.22, away: 0.12 },
    result: "HOME",
  },
  {
    homeTeam: "Brazil",
    awayTeam: "Switzerland",
    prices: { home: 0.6, draw: 0.25, away: 0.15 },
    result: "DRAW",
  },
  {
    homeTeam: "France",
    awayTeam: "Denmark",
    prices: { home: 0.58, draw: 0.26, away: 0.16 },
    result: "HOME",
  },
  {
    homeTeam: "Spain",
    awayTeam: "Japan",
    prices: { home: 0.55, draw: 0.27, away: 0.18 },
    result: "AWAY",
  },
  {
    homeTeam: "England",
    awayTeam: "USA",
    prices: { home: 0.57, draw: 0.27, away: 0.16 },
    result: "DRAW",
  },
  {
    homeTeam: "Portugal",
    awayTeam: "Morocco",
    prices: { home: 0.52, draw: 0.28, away: 0.2 },
    result: "HOME",
  },
  {
    homeTeam: "Netherlands",
    awayTeam: "Senegal",
    prices: { home: 0.56, draw: 0.27, away: 0.17 },
    result: "HOME",
  },
  {
    homeTeam: "Germany",
    awayTeam: "Croatia",
    prices: { home: 0.45, draw: 0.29, away: 0.26 },
    result: "AWAY",
  },
];
