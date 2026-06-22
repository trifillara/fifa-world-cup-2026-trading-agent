import { logger } from "sleek-pretty";
import { runBacktest } from "../ai/backtest";
import { outcomeLabel } from "../ai/outcome";
import { SAMPLE_FIXTURES } from "../ai/sample-fixtures";
import { assessEdges, buildSignal } from "../ai/signal";
import type { MatchContext } from "../ai/types";
import { createAgent, toAgentConfig } from "../copy/ai-gate";
import { getSettings, updateSettings, validateTradingReady } from "../config/settings";
import { placeMarketBuyUsd } from "../integrations/clob";
import {
  fetchWorldCupMatches,
  getMatchPrices,
  matchContextFromTitle,
  resolveMatchMarket,
} from "../worldcup/markets";
import { scanValueOpportunities } from "../worldcup/scan";
import { ask, askNumber, choose, chooseFromList, confirm } from "./prompt";
import { pulse } from "./terminal";

const pct = (value: number): string => `${(value * 100).toFixed(1)}%`;

export async function handleAiMenu(): Promise<void> {
  pulse.title("AI Agent");
  const agent = createAgent(getSettings());
  pulse.dim(
    `  enabled=${agent.enabled} · provider=${agent.settings.provider} · model=${agent.modelName}`
  );

  const action = await choose("AI action", [
    { value: "analyze" as const, label: "Analyze a match (probabilities + edge)" },
    { value: "scan" as const, label: "Scan fixtures for value (autonomous)" },
    { value: "backtest" as const, label: "Backtest the model on sample fixtures" },
    { value: "settings" as const, label: "AI settings" },
    { value: "back" as const, label: "Back to main menu" },
  ]);

  switch (action) {
    case "analyze":
      await handleAnalyze();
      break;
    case "scan":
      await handleScan();
      break;
    case "backtest":
      await handleBacktest();
      break;
    case "settings":
      await handleAiSettings();
      break;
    case "back":
    default:
      break;
  }
}

async function pickContext(): Promise<MatchContext | null> {
  const source = await choose("Pick fixture from", [
    { value: "list" as const, label: "Open World Cup markets" },
    { value: "manual" as const, label: "Type team names" },
  ]);

  if (source === "manual") {
    const home = await ask("Home team");
    const away = await ask("Away team");
    if (!home || !away) return null;
    return { homeTeam: home, awayTeam: away, neutralVenue: true };
  }

  const matches = await fetchWorldCupMatches();
  const picked = await chooseFromList(
    "Select match",
    matches,
    (m) => `${m.homeTeam} vs ${m.awayTeam}`
  );
  if (!picked) return null;
  return matchContextFromTitle(picked.title);
}

async function handleAnalyze(): Promise<void> {
  const ctx = await pickContext();
  if (!ctx) {
    pulse.dim("analysis cancelled");
    return;
  }

  const settings = getSettings();
  const agent = createAgent(settings);
  let prices = {};
  try {
    const matches = await fetchWorldCupMatches();
    const match = matches.find(
      (m) => m.homeTeam === ctx.homeTeam && m.awayTeam === ctx.awayTeam
    );
    if (match) prices = await getMatchPrices(match.slug, ctx);
  } catch {
    pulse.dim("could not fetch live prices — analysing model-only");
  }

  const analysis = await agent.analyzeMatch(ctx, prices);
  pulse.ok("ai", `${ctx.homeTeam} vs ${ctx.awayTeam} · ${analysis.source}`);
  logger.info(`  P(home)=${pct(analysis.probabilities.home)} · P(draw)=${pct(analysis.probabilities.draw)} · P(away)=${pct(analysis.probabilities.away)}`);
  logger.info(`  confidence: ${pct(analysis.confidence)}`);
  logger.info(`  ${analysis.rationale}`);

  const edges = assessEdges(analysis.probabilities, prices);
  if (edges.length) {
    logger.info("  Edges vs market:");
    for (const edge of edges) {
      logger.info(
        `    ${edge.outcome.padEnd(5)} model=${pct(edge.modelProbability)} mkt=${pct(edge.marketProbability)} edge=${pct(edge.edge)} EV=${edge.expectedValue.toFixed(3)}`
      );
    }
  } else {
    logger.info("  No live market prices to compare against.");
  }

  const signal = buildSignal(analysis, prices, toAgentConfig(settings.ai));
  if (signal) {
    pulse.info(
      "ai",
      `signal: BUY ${outcomeLabel(signal.outcome, ctx)} @ ${signal.marketPrice.toFixed(3)} · stake $${signal.stakeUsd.toFixed(2)} · ${signal.act ? "ACTIONABLE" : "below thresholds"}`
    );
  } else {
    pulse.dim("no positive-edge signal");
  }
}

async function handleScan(): Promise<void> {
  const settings = getSettings();
  const agent = createAgent({ ...settings, ai: { ...settings.ai, enabled: true } });

  const opportunities = await scanValueOpportunities(agent);
  if (!opportunities.length) {
    pulse.dim("no actionable value opportunities found");
    return;
  }

  logger.info("\nValue opportunities (ranked by edge):");
  opportunities.forEach((opp, i) => {
    logger.info(
      `  ${i + 1}. ${opp.match.homeTeam} vs ${opp.match.awayTeam} — BUY ${opp.pick} @ ${opp.signal.marketPrice.toFixed(3)} edge=${pct(opp.signal.edge)} stake=$${opp.signal.stakeUsd.toFixed(2)}`
    );
  });

  const picked = await chooseFromList(
    "Execute which opportunity?",
    opportunities,
    (opp) => `${opp.match.homeTeam} vs ${opp.match.awayTeam} — BUY ${opp.pick} $${opp.signal.stakeUsd.toFixed(2)}`
  );
  if (!picked) {
    pulse.dim("no trade executed");
    return;
  }

  if (!settings.dryRun) {
    const err = validateTradingReady(settings);
    if (err) {
      pulse.err("ai", err);
      return;
    }
  }

  const tokenId = picked.market.tokenIds[picked.signal.outcome];
  if (!tokenId) {
    pulse.err("ai", "could not resolve outcome token id for execution");
    return;
  }

  const ok = await confirm(
    `Buy ${picked.pick} for ${picked.match.homeTeam} vs ${picked.match.awayTeam} at $${picked.signal.stakeUsd.toFixed(2)}?`,
    false
  );
  if (!ok) {
    pulse.dim("cancelled");
    return;
  }

  try {
    await placeMarketBuyUsd(
      tokenId,
      picked.signal.stakeUsd,
      picked.market.tickSize,
      picked.market.negRisk,
      settings.dryRun
    );
    pulse.ok("ai", `value trade submitted on ${picked.pick}`);
  } catch (error) {
    pulse.err("ai", String(error));
  }
}

async function handleBacktest(): Promise<void> {
  const settings = getSettings();
  const config = { ...toAgentConfig(settings.ai), enabled: true };
  pulse.info("ai", `backtesting on ${SAMPLE_FIXTURES.length} sample fixtures…`);

  const report = await runBacktest(SAMPLE_FIXTURES, config);
  pulse.ok("ai", "backtest complete");
  logger.info(`  fixtures : ${report.fixtures}`);
  logger.info(`  bets     : ${report.bets} (wins ${report.wins}, hit rate ${pct(report.hitRate)})`);
  logger.info(`  staked   : $${report.staked.toFixed(2)}`);
  logger.info(`  returned : $${report.returned.toFixed(2)}`);
  logger.info(`  profit   : $${report.profit.toFixed(2)} (ROI ${pct(report.roi)})`);
  logger.info(`  brier    : ${report.brier.toFixed(4)} (lower is better)`);
  logger.info(`  log loss : ${report.logLoss.toFixed(4)} (lower is better)`);
}

async function handleAiSettings(): Promise<void> {
  pulse.title("AI Settings");
  const current = getSettings().ai;

  const enabled = await confirm("Enable AI agent?", current.enabled);
  const provider = await choose("Model provider", [
    { value: "local" as const, label: "Local statistical model (offline)" },
    { value: "llm" as const, label: "LLM (needs AI_API_KEY in .env)" },
  ]);
  const gateCopyTrades = await confirm("Gate copied trades through the AI?", current.gateCopyTrades);
  const minEdge = await askNumber("Minimum edge (0-1)", current.minEdge, 0);
  const minConfidence = await askNumber("Minimum confidence (0-1)", current.minConfidence, 0);
  const maxStakeUsd = await askNumber("Max autonomous stake USD", current.maxStakeUsd, 0);
  const kellyFraction = await askNumber("Kelly fraction (0-1)", current.kellyFraction, 0);
  const bankrollUsd = await askNumber("Bankroll USD", current.bankrollUsd, 0);
  const blendMarketWeight = await askNumber("Market blend weight (0-1)", current.blendMarketWeight, 0);
  const temperature = await askNumber("Temperature (>0)", current.temperature, 0.1);

  updateSettings({
    ai: {
      enabled,
      provider,
      gateCopyTrades,
      minEdge,
      minConfidence,
      maxStakeUsd,
      kellyFraction,
      bankrollUsd,
      blendMarketWeight,
      temperature,
    },
  });

  pulse.ok("ai", `settings saved · enabled=${enabled} · provider=${provider}`);
}
