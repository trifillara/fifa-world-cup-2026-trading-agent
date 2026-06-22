import type { MarketPrices, OutcomeProbabilities } from "./types";

/**
 * Convert raw outcome token prices into a clean probability distribution.
 *
 * Polymarket prices are already probabilities in [0, 1], but the three outcome
 * tokens rarely sum to exactly 1 (spread / overround). Normalizing removes that
 * "vig" so the model compares like-for-like.
 */
export function impliedProbabilities(
  prices: MarketPrices
): OutcomeProbabilities | null {
  const home = clampPrice(prices.home);
  const draw = clampPrice(prices.draw);
  const away = clampPrice(prices.away);

  const total = home + draw + away;
  if (total <= 0) return null;

  return { home: home / total, draw: draw / total, away: away / total };
}

/** Total booked probability across outcomes; > 1 indicates overround (vig). */
export function overround(prices: MarketPrices): number {
  return clampPrice(prices.home) + clampPrice(prices.draw) + clampPrice(prices.away);
}

/** True when all three outcome prices are present and sane. */
export function hasCompletePrices(prices: MarketPrices): boolean {
  return (
    isValidPrice(prices.home) &&
    isValidPrice(prices.draw) &&
    isValidPrice(prices.away)
  );
}

function isValidPrice(price: number | undefined): boolean {
  return typeof price === "number" && price > 0 && price < 1;
}

function clampPrice(price: number | undefined): number {
  if (typeof price !== "number" || !Number.isFinite(price)) return 0;
  return Math.min(1, Math.max(0, price));
}
