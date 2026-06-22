import type { AiAgentConfig } from "./config";
import { LlmModel } from "./llm";
import { LocalStatisticalModel } from "./local-model";
import type { Model } from "./model";

/**
 * Connection details for the LLM provider, sourced from the environment so
 * that secrets never live in `bot.toml`. Behavioural knobs (temperature,
 * blend weight) come from {@link AiAgentConfig} instead.
 */
export interface LlmEnv {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function readLlmEnv(): LlmEnv {
  return {
    apiKey: (process.env.AI_API_KEY ?? "").trim(),
    baseUrl: (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").trim(),
    model: (process.env.AI_MODEL ?? "gpt-4o-mini").trim(),
  };
}

/**
 * Build the model backing the agent. Falls back to the offline statistical
 * model when the LLM provider is selected but no API key is configured, so the
 * agent stays useful out of the box.
 */
export function createModel(config: AiAgentConfig, env: LlmEnv = readLlmEnv()): Model {
  if (config.provider === "llm" && env.apiKey) {
    return new LlmModel({
      apiKey: env.apiKey,
      baseUrl: env.baseUrl,
      model: env.model,
      temperature: config.temperature,
    });
  }
  return new LocalStatisticalModel(config.blendMarketWeight, config.temperature);
}
