import TOML from "@iarna/toml";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  DRY_RUN,
  loadLeadersFromEnv,
  POLYMARKET_FUNDER_ADDRESS,
  POLYMARKET_PRIVATE_KEY,
} from "./env";
import type { BotSettings, CopyStrategy } from "../types";

const CONFIG_PATH = resolve(process.cwd(), "config", "bot.toml");

interface TomlCopy {
  strategy?: string;
  trade_usd?: number;
  percent_of_leader?: number;
  copy_divisor?: number;
  min_order_usd?: number;
  whale_min_usd?: number;
  round_up_small?: boolean;
  poll_ms?: number;
  activity_limit?: number;
  world_cup_only?: boolean;
}

interface TomlDraw {
  default_usd?: number;
  max_slippage_cents?: number;
}

interface TomlRoot {
  copy?: TomlCopy;
  draw?: TomlDraw;
}

function readToml(): TomlRoot {
  if (!existsSync(CONFIG_PATH)) return {};
  const raw = readFileSync(CONFIG_PATH, "utf8");
  return TOML.parse(raw) as TomlRoot;
}

function asStrategy(value: string | undefined): CopyStrategy {
  const allowed: CopyStrategy[] = [
    "scaled",
    "fixed_usd",
    "percent_leader",
    "whale_gate",
  ];
  if (value && allowed.includes(value as CopyStrategy)) {
    return value as CopyStrategy;
  }
  return "scaled";
}

let runtimeSettings: BotSettings | null = null;

export function loadSettings(): BotSettings {
  const toml = readToml();
  const copy = toml.copy ?? {};
  const draw = toml.draw ?? {};

  const settings: BotSettings = {
    leaders: loadLeadersFromEnv(),
    strategy: asStrategy(copy.strategy),
    tradeUsd: copy.trade_usd ?? 5,
    percentOfLeader: copy.percent_of_leader ?? 25,
    copyDivisor: copy.copy_divisor ?? 100,
    minOrderUsd: copy.min_order_usd ?? 1,
    whaleMinUsd: copy.whale_min_usd ?? 500,
    roundUpSmall: copy.round_up_small ?? false,
    pollMs: Math.max(200, copy.poll_ms ?? 500),
    activityLimit: Math.min(500, Math.max(10, copy.activity_limit ?? 50)),
    worldCupOnly: copy.world_cup_only ?? true,
    drawDefaultUsd: draw.default_usd ?? 10,
    drawMaxSlippageCents: draw.max_slippage_cents ?? 3,
    dryRun: DRY_RUN,
  };

  runtimeSettings = settings;
  return settings;
}

export function getSettings(): BotSettings {
  if (!runtimeSettings) return loadSettings();
  return runtimeSettings;
}

export function updateSettings(patch: Partial<BotSettings>): BotSettings {
  const current = getSettings();
  runtimeSettings = { ...current, ...patch };
  return runtimeSettings;
}

export function validateTradingReady(settings: BotSettings): string | null {
  if (settings.dryRun) return null;
  if (!POLYMARKET_PRIVATE_KEY) {
    return "Set POLYMARKET_PRIVATE_KEY in .env for live trading.";
  }
  if (!POLYMARKET_FUNDER_ADDRESS) {
    return "Set POLYMARKET_FUNDER_ADDRESS in .env for live trading.";
  }
  if (!settings.leaders.length) {
    return "Add at least one leader wallet (LEADER_WALLETS in .env or via CLI Settings).";
  }
  return null;
}
