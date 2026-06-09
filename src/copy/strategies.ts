import type { BotSettings, CopyStrategy, ScaledOrder } from "../types";
import { num, scaleUsd } from "./scaling";

export interface StrategyInput {
  leaderUsd: number;
  leaderKind: "whale" | "trader";
}

export function describeStrategy(strategy: CopyStrategy): string {
  const map: Record<CopyStrategy, string> = {
    scaled: "Mirror leader at 1/copy_divisor scale",
    fixed_usd: "Fixed USD on every copied trade",
    percent_leader: "Percent of leader trade size",
    whale_gate: "Only copy when leader trade >= whale_min_usd, then scaled",
  };
  return map[strategy];
}

export function computeCopyUsd(
  settings: BotSettings,
  input: StrategyInput
): ScaledOrder | null {
  const { leaderUsd } = input;
  if (leaderUsd <= 0) return null;

  let targetUsd = settings.tradeUsd;

  switch (settings.strategy) {
    case "scaled":
      targetUsd = leaderUsd / settings.copyDivisor;
      break;
    case "fixed_usd":
      targetUsd = settings.tradeUsd;
      break;
    case "percent_leader":
      targetUsd = leaderUsd * (settings.percentOfLeader / 100);
      break;
    case "whale_gate":
      if (leaderUsd < settings.whaleMinUsd) return null;
      targetUsd = leaderUsd / settings.copyDivisor;
      break;
    default:
      targetUsd = settings.tradeUsd;
  }

  return scaleUsd(
    leaderUsd,
    targetUsd,
    settings.minOrderUsd,
    settings.roundUpSmall
  );
}

export function leaderTradeUsd(event: {
  usdcSize?: unknown;
  price?: unknown;
  size?: unknown;
}): number {
  const direct = num(event.usdcSize);
  if (direct > 0) return direct;
  return num(event.price) * num(event.size);
}
