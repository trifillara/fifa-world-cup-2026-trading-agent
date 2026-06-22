import type { Model } from "./model";
import { normalizeProbabilities } from "./probability";
import type {
  MarketPrices,
  MatchContext,
  ModelAnalysis,
  OutcomeProbabilities,
} from "./types";

/**
 * LLM-backed model using an OpenAI-compatible chat completions endpoint.
 *
 * The provider is asked to return strict JSON with outcome probabilities, a
 * confidence score, and a one-line rationale. Works with OpenAI, OpenRouter,
 * Together, Groq, local Ollama (OpenAI shim), etc. — anything that speaks the
 * `/chat/completions` contract.
 */
export interface LlmModelOptions {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  timeoutMs?: number;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface RawForecast {
  home?: number;
  draw?: number;
  away?: number;
  confidence?: number;
  rationale?: string;
}

export class LlmModel implements Model {
  readonly name: string;

  constructor(private readonly opts: LlmModelOptions) {
    this.name = `llm:${opts.model}`;
  }

  async analyze(ctx: MatchContext, market: MarketPrices): Promise<ModelAnalysis> {
    if (!this.opts.apiKey) {
      throw new Error("AI_API_KEY is required for the LLM provider.");
    }

    const content = await this.complete(buildPrompt(ctx, market));
    const forecast = parseForecast(content);
    const probabilities = normalizeProbabilities({
      home: clamp01(forecast.home),
      draw: clamp01(forecast.draw),
      away: clamp01(forecast.away),
    });

    return {
      probabilities,
      confidence: clamp01(forecast.confidence ?? 0.5),
      rationale: forecast.rationale?.trim() || "LLM forecast.",
      source: this.name,
    };
  }

  private async complete(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.opts.timeoutMs ?? 20_000
    );

    try {
      const response = await fetch(`${trimSlash(this.opts.baseUrl)}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.opts.apiKey}`,
        },
        body: JSON.stringify({
          model: this.opts.model,
          temperature: this.opts.temperature,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`LLM API ${response.status}: ${text.slice(0, 200)}`);
      }

      const data = (await response.json()) as ChatCompletionResponse;
      return data.choices?.[0]?.message?.content ?? "";
    } finally {
      clearTimeout(timeout);
    }
  }
}

const SYSTEM_PROMPT =
  "You are a quantitative football analyst. Estimate FIFA World Cup 2026 match " +
  "outcome probabilities. Respond ONLY with strict JSON of the form " +
  '{"home":0.0,"draw":0.0,"away":0.0,"confidence":0.0,"rationale":"..."}. ' +
  "Probabilities must be in [0,1] and sum to ~1.";

function buildPrompt(ctx: MatchContext, market: MarketPrices): string {
  const lines = [
    `Match: ${ctx.homeTeam} (home) vs ${ctx.awayTeam} (away).`,
    ctx.neutralVenue ? "Venue: neutral." : "Venue: home advantage applies.",
  ];
  if (ctx.kickoff) lines.push(`Kickoff: ${ctx.kickoff}.`);
  if (ctx.note) lines.push(`Notes: ${ctx.note}.`);
  if (market.home != null || market.draw != null || market.away != null) {
    lines.push(
      `Market prices — home: ${fmt(market.home)}, draw: ${fmt(market.draw)}, away: ${fmt(market.away)}.`
    );
  }
  lines.push("Return your probability estimate as strict JSON.");
  return lines.join("\n");
}

function parseForecast(content: string): RawForecast {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as RawForecast;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as RawForecast;
      } catch {
        // fall through
      }
    }
  }
  throw new Error("Could not parse LLM JSON response.");
}

function clamp01(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function fmt(value: number | undefined): string {
  return typeof value === "number" ? value.toFixed(3) : "n/a";
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
