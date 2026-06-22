import { clamp } from "./probability";

/**
 * Kelly criterion position sizing for a binary outcome token.
 *
 * Buying one share at `price` pays $1 if the outcome resolves YES, so the net
 * decimal odds are b = (1 - price) / price. The Kelly-optimal fraction of
 * bankroll is f* = (b·p - q) / b, with p the win probability and q = 1 - p.
 * A negative result means there is no edge, so we floor at 0.
 */
export function kellyFraction(probability: number, price: number): number {
  if (price <= 0 || price >= 1) return 0;
  const p = clamp(probability, 0, 1);
  const q = 1 - p;
  const b = (1 - price) / price;
  if (b <= 0) return 0;
  const f = (b * p - q) / b;
  return Math.max(0, f);
}

/**
 * Translate a Kelly fraction into a dollar stake.
 *
 * `fraction` scales full Kelly (e.g. 0.25 for quarter-Kelly) and the result is
 * capped at `maxStakeUsd` to bound single-trade risk.
 */
export function stakeFromKelly(
  bankrollUsd: number,
  fullKelly: number,
  fraction: number,
  maxStakeUsd: number
): number {
  const scaled = Math.max(0, fullKelly) * clamp(fraction, 0, 1);
  const raw = scaled * Math.max(0, bankrollUsd);
  return Math.min(raw, Math.max(0, maxStakeUsd));
}
