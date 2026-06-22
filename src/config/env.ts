import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import type { LeaderKind, LeaderTarget } from "../types";

loadDotenv({ path: resolve(process.cwd(), ".env") });

export const POLYMARKET_PRIVATE_KEY = (process.env.POLYMARKET_PRIVATE_KEY ?? "").trim();
export const POLYMARKET_FUNDER_ADDRESS = (
  process.env.POLYMARKET_FUNDER_ADDRESS ??
  process.env.PROXY_WALLET_ADDRESS ??
  ""
).trim();
export const POLYMARKET_SIGNATURE_TYPE = (
  process.env.POLYMARKET_SIGNATURE_TYPE ?? "POLY_PROXY"
).trim();

export function envBool(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

export function envNumber(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === "") return defaultValue;
  const value = Number(raw);
  return Number.isFinite(value) ? value : defaultValue;
}

// --- AI agent connection (secrets stay in env, never in bot.toml) ---
export const AI_ENABLED = envBool("AI_ENABLED", false);
export const AI_PROVIDER = (process.env.AI_PROVIDER ?? "local").trim().toLowerCase();
export const AI_API_KEY = (process.env.AI_API_KEY ?? "").trim();
export const AI_BASE_URL = (
  process.env.AI_BASE_URL ?? "https://api.openai.com/v1"
).trim();
export const AI_MODEL = (process.env.AI_MODEL ?? "gpt-4o-mini").trim();

function normalizeWallet(wallet: string): string {
  const w = wallet.trim().toLowerCase();
  return w.startsWith("0x") ? w : `0x${w}`;
}

/**
 * Parse `whale:0xabc:Label,trader:0xdef` or plain `0xabc:Label`.
 */
export function parseLeaderEntries(raw: string): LeaderTarget[] {
  const entries = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const leaders: LeaderTarget[] = [];

  for (const entry of entries) {
    let rest = entry;
    let kind: LeaderKind = "trader";

    if (rest.startsWith("whale:")) {
      kind = "whale";
      rest = rest.slice("whale:".length);
    } else if (rest.startsWith("trader:")) {
      kind = "trader";
      rest = rest.slice("trader:".length);
    }

    const colon = rest.indexOf(":");
    if (colon > 0 && rest.startsWith("0x")) {
      const wallet = normalizeWallet(rest.slice(0, colon));
      const label = rest.slice(colon + 1).trim() || wallet.slice(0, 10);
      leaders.push({ wallet, label, kind });
    } else {
      const wallet = normalizeWallet(rest);
      leaders.push({
        wallet,
        label: wallet.slice(0, 10),
        kind,
      });
    }
  }

  return leaders;
}

export function loadLeadersFromEnv(): LeaderTarget[] {
  const raw = process.env.LEADER_WALLETS?.trim() ?? "";
  if (!raw) return [];
  return parseLeaderEntries(raw);
}

export const DRY_RUN = envBool("DRY_RUN", true);
