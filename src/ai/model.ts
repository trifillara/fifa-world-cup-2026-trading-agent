import type { MarketPrices, MatchContext, ModelAnalysis } from "./types";

/**
 * A pluggable probability model.
 *
 * Implementations turn a fixture (and optionally the live market) into a
 * probability distribution plus a confidence score. The local statistical
 * model and the LLM-backed model both satisfy this contract, so the agent can
 * swap providers without changing any downstream sizing or gating logic.
 */
export interface Model {
  /** Stable identifier used in logs and analysis provenance. */
  readonly name: string;
  analyze(ctx: MatchContext, market: MarketPrices): Promise<ModelAnalysis>;
}
