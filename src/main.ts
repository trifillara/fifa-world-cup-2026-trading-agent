import { printBanner } from "./cli/banner";
import { runInteractiveMenu } from "./cli/menu";
import { pulse } from "./cli/terminal";
import { loadSettings } from "./config/settings";
import { CopyEngine } from "./copy/engine";
import {
  closeRedisClient,
  isRedisEnabled,
  pingRedis,
} from "./integrations/redis";

async function main(): Promise<void> {
  printBanner();

  const settings = loadSettings();
  pulse.info("mode", settings.dryRun ? "DRY-RUN (simulated orders)" : "LIVE trading");
  pulse.info("config", `strategy=${settings.strategy} · trade=$${settings.tradeUsd} · leaders=${settings.leaders.length}`);
  pulse.info(
    "ai",
    settings.ai.enabled
      ? `agent ON · provider=${settings.ai.provider} · copy-gate=${settings.ai.gateCopyTrades}`
      : "agent off — enable in AI menu or set AI_ENABLED=true"
  );

  if (isRedisEnabled()) {
    const connected = await pingRedis();
    if (connected) {
      pulse.ok("redis", "connected — activity dedup persisted");
    } else {
      pulse.warn("redis", "configured but unreachable — using in-memory cache");
    }
  } else {
    pulse.dim("redis disabled — set REDIS_URL or REDIS_ENABLED=true to persist seen trades");
  }

  pulse.dim("Tip: use menu option 5 to add whale / super-trader wallets");

  const engine = new CopyEngine();

  try {
    await runInteractiveMenu(engine);
  } finally {
    await closeRedisClient();
  }

  pulse.ok("exit", "FIFA 2026 AI trading agent stopped — good luck!");
}

main().catch(async (error) => {
  pulse.err("fatal", String(error));
  await closeRedisClient();
  process.exit(1);
});
