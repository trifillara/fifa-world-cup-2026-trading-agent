import { pulse } from "../cli/terminal";
import { getSettings } from "../config/settings";
import type { BotSettings } from "../types";
import { ActivityPoller } from "./activity";
import { CopyExecutor } from "./executor";
import { describeStrategy } from "./strategies";

export class CopyEngine {
  private pollers: ActivityPoller[] = [];
  private executors: CopyExecutor[] = [];
  private running = false;
  private loopPromise: Promise<void> | null = null;

  async start(settings: BotSettings): Promise<void> {
    if (this.running) return;
    if (!settings.leaders.length) {
      throw new Error("No leader wallets configured.");
    }

    this.pollers = settings.leaders.map(
      (leader) => new ActivityPoller(leader.wallet, leader.label, settings.activityLimit)
    );
    this.executors = settings.leaders.map(
      (leader) => new CopyExecutor(settings, leader)
    );

    await Promise.all(this.pollers.map((poller) => poller.init()));

    this.running = true;
    pulse.ok("engine", `copy trading started (${settings.leaders.length} leaders)`);
    pulse.info("strategy", describeStrategy(settings.strategy));

    this.loopPromise = this.runLoop();
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.loopPromise) {
      await this.loopPromise;
      this.loopPromise = null;
    }
    pulse.info("engine", "copy trading stopped");
  }

  get isRunning(): boolean {
    return this.running;
  }

  private async runLoop(): Promise<void> {
    while (this.running) {
      const settings = getSettings();
      try {
        await Promise.all(
          this.pollers.map(async (poller, i) => {
            const events = await poller.fetchLatest();
            if (!poller.isBootstrapped) {
              const n = await poller.bootstrap(events);
              pulse.info(
                poller.label,
                `zero-point: ${n} recent activities marked seen`
              );
              return;
            }

            const fresh = await poller.newEvents(events);
            for (const ev of fresh) {
              try {
                await this.executors[i].handle(ev);
              } catch (error) {
                pulse.err("copy", `${settings.leaders[i].label}: ${String(error)}`);
              }
            }
          })
        );
      } catch (error) {
        pulse.err("poll", String(error));
      }

      await sleep(settings.pollMs);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
