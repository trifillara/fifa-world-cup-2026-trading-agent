import { DEFAULT_AI_CONFIG, type AiAgentConfig } from "./config";
import type { Model } from "./model";
import { resolveOutcome } from "./outcome";
import { probabilityOf } from "./probability";
import { createModel } from "./provider";
import { assessEdges, buildSignal } from "./signal";
import type {
  MarketPrices,
  MatchContext,
  MatchOutcome,
  ModelAnalysis,
  TradeSignal,
} from "./types";

export interface CopyDecision {
  approved: boolean;
  reason: string;
  edge?: number;
  confidence?: number;
}

interface CacheEntry {
  at: number;
  analysis: ModelAnalysis;
}

/**
 * High-level façade over the model: caches analyses, turns them into sized
 * trade signals, and adjudicates whether a leader's copied trade has model
 * support. All methods fail open (approve / return null) so the agent can
 * never deadlock the rest of the bot.
 */
export class AiAgent {
  private readonly model: Model;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly config: AiAgentConfig = DEFAULT_AI_CONFIG,
    model?: Model,
    private readonly cacheTtlMs = 60_000
  ) {
    this.model = model ?? createModel(config);
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  get modelName(): string {
    return this.model.name;
  }

  get settings(): AiAgentConfig {
    return this.config;
  }

  async analyzeMatch(ctx: MatchContext, market: MarketPrices): Promise<ModelAnalysis> {
    const key = cacheKey(ctx, market);
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < this.cacheTtlMs) {
      return cached.analysis;
    }
    const analysis = await this.model.analyze(ctx, market);
    this.cache.set(key, { at: Date.now(), analysis });
    return analysis;
  }

  /** Full evaluation producing the best actionable BUY signal, if any. */
  async evaluate(ctx: MatchContext, market: MarketPrices): Promise<TradeSignal | null> {
    const analysis = await this.analyzeMatch(ctx, market);
    return buildSignal(analysis, market, this.config);
  }

  /**
   * Decide whether to copy a leader's trade on a given outcome. When disabled
   * the agent always approves, preserving the original copy behaviour.
   */
  async approveCopy(
    ctx: MatchContext,
    market: MarketPrices,
    outcomeLabel: string | undefined
  ): Promise<CopyDecision> {
    if (!this.config.enabled || !this.config.gateCopyTrades) {
      return { approved: true, reason: "ai gate disabled" };
    }

    const outcome = resolveOutcome(outcomeLabel, ctx);
    if (!outcome) {
      return { approved: true, reason: "outcome not resolvable — not gating" };
    }

    const analysis = await this.analyzeMatch(ctx, market);
    const assessment = assessEdges(analysis.probabilities, market).find(
      (a) => a.outcome === outcome
    );
    const modelProb = assessment?.modelProbability ?? probabilityOf(analysis.probabilities, outcome);
    const edge = assessment?.edge ?? 0;

    if (analysis.confidence < this.config.minConfidence) {
      return {
        approved: false,
        reason: `confidence ${pct(analysis.confidence)} < ${pct(this.config.minConfidence)}`,
        edge,
        confidence: analysis.confidence,
      };
    }

    if (edge < this.config.minEdge) {
      return {
        approved: false,
        reason: `edge ${pct(edge)} < ${pct(this.config.minEdge)} on ${outcome}`,
        edge,
        confidence: analysis.confidence,
      };
    }

    return {
      approved: true,
      reason: `model agrees: P=${pct(modelProb)}, edge ${pct(edge)}`,
      edge,
      confidence: analysis.confidence,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

function cacheKey(ctx: MatchContext, market: MarketPrices): string {
  const teams = `${ctx.homeTeam}|${ctx.awayTeam}|${ctx.neutralVenue ? "n" : "h"}`;
  const prices = `${round(market.home)}|${round(market.draw)}|${round(market.away)}`;
  return `${teams}#${prices}`;
}

function round(value: number | undefined): string {
  return typeof value === "number" ? value.toFixed(3) : "_";
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export type { MatchOutcome };
