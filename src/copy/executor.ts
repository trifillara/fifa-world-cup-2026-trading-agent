import { placeMarketBuyUsd } from "../integrations/clob";
import { getMarketBySlug } from "../integrations/gamma";
import { pulse } from "../cli/terminal";
import type { ActivityEvent, BotSettings, LeaderTarget } from "../types";
import { isWorldCupEvent } from "../worldcup/markets";
import { computeCopyUsd, leaderTradeUsd } from "./strategies";

function parseTick(market: { orderPriceMinTickSize?: number }): string {
  const tick = market.orderPriceMinTickSize ?? 0.01;
  return tick.toFixed(2);
}

export class CopyExecutor {
  constructor(
    private readonly settings: BotSettings,
    private readonly leader: LeaderTarget
  ) {}

  async handle(event: ActivityEvent): Promise<void> {
    const typ = (event.type ?? "").toUpperCase();
    if (typ !== "TRADE") return;

    if (this.settings.worldCupOnly && !isWorldCupEvent(event)) {
      pulse.dim(
        `[${this.leader.label}] skip non-World-Cup: ${(event.title ?? "").slice(0, 50)}`
      );
      return;
    }

    const side = (event.side ?? "").toUpperCase();
    const asset = event.asset ?? "";
    if (!asset || (side !== "BUY" && side !== "SELL")) return;

    const leaderUsd = leaderTradeUsd(event);
    const scaled = computeCopyUsd(this.settings, {
      leaderUsd,
      leaderKind: this.leader.kind,
    });

    if (!scaled) {
      pulse.dim(
        `[${this.leader.label}] skip ${side} ${(event.title ?? "").slice(0, 40)} leader=$${leaderUsd.toFixed(2)}`
      );
      return;
    }

    const bump = scaled.wasBumpedToMin ? " (min bump)" : "";
    pulse.info(
      "copy",
      `[${this.leader.kind}/${this.leader.label}] ${side} ${(event.outcome ?? event.title ?? "").slice(0, 40)} leader=$${scaled.leaderValue.toFixed(2)} → $${scaled.value.toFixed(2)}${bump}`
    );

    if (side === "SELL") {
      pulse.warn("copy", "SELL mirroring not automated — review position manually.");
      return;
    }

    let tickSize = "0.01";
    let negRisk = false;
    if (event.slug) {
      try {
        const market = await getMarketBySlug(event.slug);
        tickSize = parseTick(market);
        negRisk = Boolean(market.negRisk);
      } catch {
        pulse.warn("copy", "Could not resolve market metadata — using defaults.");
      }
    }

    await placeMarketBuyUsd(
      asset,
      scaled.value,
      tickSize,
      negRisk,
      this.settings.dryRun
    );
  }
}
