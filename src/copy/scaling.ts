import type { ScaledOrder } from "../types";

export function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") return Number(v) || 0;
  return 0;
}

export function scaleUsd(
  leaderUsd: number,
  copyUsd: number,
  minUsd: number,
  roundUpSmall: boolean
): ScaledOrder | null {
  if (leaderUsd <= 0 || copyUsd <= 0) return null;

  let value = copyUsd;
  let wasBumpedToMin = false;

  if (value < minUsd) {
    if (!roundUpSmall) return null;
    value = minUsd;
    wasBumpedToMin = true;
  }

  return { value, leaderValue: leaderUsd, wasBumpedToMin };
}
