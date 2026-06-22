export type LeaderKind = "whale" | "trader";

export type CopyStrategy =
  | "scaled"
  | "fixed_usd"
  | "percent_leader"
  | "whale_gate";

export interface LeaderTarget {
  wallet: string;
  label: string;
  kind: LeaderKind;
}

export interface ActivityEvent {
  type?: string;
  side?: string;
  asset?: string;
  conditionId?: string;
  size?: number | string;
  price?: number | string;
  usdcSize?: number | string;
  timestamp?: number | string;
  title?: string;
  slug?: string;
  eventSlug?: string;
  outcome?: string;
  outcomeIndex?: number;
  transactionHash?: string;
}

export interface WorldCupMatch {
  eventId: string;
  title: string;
  slug: string;
  homeTeam: string;
  awayTeam: string;
  drawTokenId: string;
  drawOutcome: string;
  conditionId: string;
  negRisk: boolean;
  tickSize: string;
}

export interface AiSettings {
  enabled: boolean;
  provider: "local" | "llm";
  gateCopyTrades: boolean;
  minEdge: number;
  minConfidence: number;
  maxStakeUsd: number;
  kellyFraction: number;
  bankrollUsd: number;
  blendMarketWeight: number;
  temperature: number;
}

export interface BotSettings {
  leaders: LeaderTarget[];
  strategy: CopyStrategy;
  tradeUsd: number;
  percentOfLeader: number;
  copyDivisor: number;
  minOrderUsd: number;
  whaleMinUsd: number;
  roundUpSmall: boolean;
  pollMs: number;
  activityLimit: number;
  worldCupOnly: boolean;
  drawDefaultUsd: number;
  drawMaxSlippageCents: number;
  dryRun: boolean;
  ai: AiSettings;
}

export interface ScaledOrder {
  value: number;
  leaderValue: number;
  wasBumpedToMin: boolean;
}
