import { logger } from "./logger";
import { CopyEngine } from "../copy/engine";
import { describeStrategy } from "../copy/strategies";
import {
  getSettings,
  updateSettings,
  validateTradingReady,
} from "../config/settings";
import { parseLeaderEntries } from "../config/env";
import { fetchLeaderboard } from "../integrations/data-api";
import type { CopyStrategy, LeaderTarget } from "../types";
import { buyDrawToken, listDrawOpportunities } from "../worldcup/draw";
import { handleAiMenu } from "./ai-menu";
import { pulse } from "./terminal";
import {
  ask,
  askNumber,
  choose,
  chooseFromList,
  closePrompt,
  confirm,
} from "./prompt";

const STRATEGIES: Array<{ value: CopyStrategy; label: string }> = [
  { value: "scaled", label: "Scaled — mirror at 1/copy_divisor" },
  { value: "fixed_usd", label: "Fixed USD — same size every copy" },
  { value: "percent_leader", label: "Percent — % of leader trade" },
  { value: "whale_gate", label: "Whale gate — min leader size, then scaled" },
];

export async function runInteractiveMenu(engine: CopyEngine): Promise<void> {
  let exit = false;

  while (!exit) {
    printMenu(engine);
    const choice = await ask("Select option", "1");

    switch (choice) {
      case "1":
        await handleStart(engine);
        break;
      case "2":
        await engine.stop();
        break;
      case "3":
        await handleSettings();
        break;
      case "4":
        await handleBuyDraw();
        break;
      case "5":
        await handleLeaders();
        break;
      case "6":
        await handleAiMenu();
        break;
      case "7":
        printStatus(engine);
        break;
      case "8":
      case "q":
      case "quit":
      case "exit":
        exit = true;
        break;
      default:
        pulse.warn("menu", "unknown option — pick 1-8");
    }
  }

  if (engine.isRunning) {
    await engine.stop();
  }
  closePrompt();
}

function printMenu(engine: CopyEngine): void {
  const s = getSettings();
  pulse.title("Main Menu");
  pulse.dim(`  Engine: ${engine.isRunning ? "RUNNING" : "stopped"} · Strategy: ${s.strategy} · Dry-run: ${s.dryRun}`);
  logger.info("");
  logger.info("  1. Start copy trading");
  logger.info("  2. Stop copy trading");
  logger.info("  3. Settings (amount, strategy, options)");
  logger.info("  4. Buy Draw token (manual match pick)");
  logger.info("  5. Manage leader wallets");
  logger.info("  6. AI agent (analyze, scan, backtest, settings)");
  logger.info("  7. Status");
  logger.info("  8. Quit");
  logger.info("");
}

async function handleStart(engine: CopyEngine): Promise<void> {
  const settings = getSettings();
  const err = validateTradingReady(settings);
  if (err) {
    pulse.err("start", err);
    return;
  }
  if (engine.isRunning) {
    pulse.warn("start", "already running");
    return;
  }
  await engine.start(settings);
}

async function handleSettings(): Promise<void> {
  pulse.title("Settings");

  const strategy = await choose("Copy strategy", STRATEGIES);
  const tradeUsd = await askNumber("Trade USD (fixed / fallback)", getSettings().tradeUsd, 0.1);
  const copyDivisor = await askNumber("Copy divisor (scaled / whale_gate)", getSettings().copyDivisor, 1);
  const percentOfLeader = await askNumber("Percent of leader (percent_leader)", getSettings().percentOfLeader, 0.1);
  const minOrderUsd = await askNumber("Minimum order USD", getSettings().minOrderUsd, 0.1);
  const whaleMinUsd = await askNumber("Whale gate minimum USD", getSettings().whaleMinUsd, 1);
  const pollMs = await askNumber("Poll interval (ms)", getSettings().pollMs, 200);
  const drawDefaultUsd = await askNumber("Default draw buy USD", getSettings().drawDefaultUsd, 0.1);
  const worldCupOnly = await confirm("Only copy FIFA / World Cup markets?", getSettings().worldCupOnly);
  const roundUpSmall = await confirm("Round small trades up to minimum?", getSettings().roundUpSmall);
  const dryRun = await confirm("Dry-run mode (no real orders)?", getSettings().dryRun);

  updateSettings({
    strategy,
    tradeUsd,
    copyDivisor,
    percentOfLeader,
    minOrderUsd,
    whaleMinUsd,
    pollMs,
    drawDefaultUsd,
    worldCupOnly,
    roundUpSmall,
    dryRun,
  });

  pulse.ok("settings", `saved · ${describeStrategy(strategy)}`);
}

async function handleBuyDraw(): Promise<void> {
  pulse.title("Buy Draw Token");
  const settings = getSettings();

  if (!settings.dryRun) {
    const err = validateTradingReady(settings);
    if (err) {
      pulse.err("draw", err);
      return;
    }
  }

  const matches = await listDrawOpportunities();
  const picked = await chooseFromList(
    "Select match",
    matches,
    (m) => `${m.homeTeam} vs ${m.awayTeam} — ${m.title.slice(0, 50)}`
  );

  if (!picked) {
    pulse.dim("draw cancelled");
    return;
  }

  const usd = await askNumber("USD to spend on Draw", settings.drawDefaultUsd, 0.1);
  const ok = await confirm(
    `Buy Draw for ${picked.homeTeam} vs ${picked.awayTeam} at $${usd.toFixed(2)}?`,
    false
  );

  if (!ok) {
    pulse.dim("draw cancelled");
    return;
  }

  try {
    await buyDrawToken(picked, usd, settings.dryRun);
  } catch (error) {
    pulse.err("draw", String(error));
  }
}

async function handleLeaders(): Promise<void> {
  pulse.title("Leader Wallets");
  const action = await choose("Leader management", [
    { value: "list" as const, label: "List current leaders" },
    { value: "add" as const, label: "Add wallet manually" },
    { value: "import_traders" as const, label: "Import top traders from leaderboard" },
    { value: "import_whales" as const, label: "Import high-volume wallets from leaderboard" },
    { value: "clear" as const, label: "Clear all leaders" },
  ]);

  const settings = getSettings();

  if (action === "list") {
    if (!settings.leaders.length) {
      pulse.dim("no leaders configured");
      return;
    }
    settings.leaders.forEach((l, i) => {
      logger.info(`  ${i + 1}. [${l.kind}] ${l.label} — ${l.wallet}`);
    });
    return;
  }

  if (action === "clear") {
    if (await confirm("Remove all leaders?", false)) {
      updateSettings({ leaders: [] });
      pulse.ok("leaders", "cleared");
    }
    return;
  }

  if (action === "add") {
    const kind = await choose("Wallet type", [
      { value: "whale" as const, label: "Whale wallet" },
      { value: "trader" as const, label: "Super trader" },
    ]);
    const wallet = await ask("Wallet address (0x…)");
    const label = await ask("Label", wallet.slice(0, 10));
    const prefix = kind === "whale" ? "whale" : "trader";
    const parsed = parseLeaderEntries(`${prefix}:${wallet}:${label}`);
    updateSettings({ leaders: [...settings.leaders, ...parsed] });
    pulse.ok("leaders", `added ${label}`);
    return;
  }

  const board = await fetchLeaderboard(25, "MONTH");
  if (!board.length) {
    pulse.warn("leaders", "leaderboard unavailable — add wallets manually");
    return;
  }

  const isWhale = action === "import_whales";
  const sorted = [...board].sort((a, b) => (isWhale ? b.vol - a.vol : b.pnl - a.pnl));
  const picks = sorted.slice(0, 10);

  logger.info(`\nTop ${isWhale ? "volume (whale)" : "PNL (trader)"} wallets:`);
  picks.forEach((row, i) => {
    logger.info(
      `  ${i + 1}. ${row.userName || row.proxyWallet.slice(0, 10)} — vol $${row.vol.toFixed(0)} pnl $${row.pnl.toFixed(0)}`
    );
  });

  const raw = await ask("Enter numbers to import (e.g. 1,2,3) or 0 to cancel", "0");
  if (raw === "0") return;

  const indices = raw
    .split(",")
    .map((s) => Number(s.trim()) - 1)
    .filter((n) => n >= 0 && n < picks.length);

  const newLeaders: LeaderTarget[] = indices.map((i) => {
    const row = picks[i];
    return {
      wallet: row.proxyWallet.toLowerCase(),
      label: row.userName || row.proxyWallet.slice(0, 10),
      kind: isWhale ? "whale" : "trader",
    };
  });

  const merged = [...settings.leaders];
  for (const leader of newLeaders) {
    if (!merged.some((m) => m.wallet === leader.wallet)) {
      merged.push(leader);
    }
  }

  updateSettings({ leaders: merged });
  pulse.ok("leaders", `imported ${newLeaders.length} wallet(s)`);
}

function printStatus(engine: CopyEngine): void {
  const s = getSettings();
  pulse.title("Status");
  logger.info(`  Engine       : ${engine.isRunning ? "RUNNING" : "stopped"}`);
  logger.info(`  Dry-run      : ${s.dryRun}`);
  logger.info(`  Strategy     : ${s.strategy} — ${describeStrategy(s.strategy)}`);
  logger.info(`  Trade USD    : $${s.tradeUsd}`);
  logger.info(`  Copy divisor : ${s.copyDivisor}`);
  logger.info(`  Min order    : $${s.minOrderUsd}`);
  logger.info(`  Whale gate   : $${s.whaleMinUsd}`);
  logger.info(`  World Cup only: ${s.worldCupOnly}`);
  logger.info(`  AI agent     : ${s.ai.enabled ? "ON" : "off"} (${s.ai.provider})`);
  logger.info(`  AI copy gate : ${s.ai.gateCopyTrades ? "on" : "off"} · min edge ${(s.ai.minEdge * 100).toFixed(1)}% · min conf ${(s.ai.minConfidence * 100).toFixed(1)}%`);
  logger.info(`  Leaders (${s.leaders.length}):`);
  s.leaders.forEach((l) => {
    logger.info(`    · [${l.kind}] ${l.label} — ${l.wallet}`);
  });
}
