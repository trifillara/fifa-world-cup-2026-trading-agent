import { fetchUserActivity } from "../integrations/data-api";
import type { ActivityEvent } from "../types";
import { ActivityStore } from "./activity-store";

export function activityKey(event: ActivityEvent): string {
  const tx = event.transactionHash ?? "";
  const typ = event.type ?? "";
  const asset = event.asset ?? "";
  const side = event.side ?? "";
  const cid = event.conditionId ?? "";
  const ts = event.timestamp ?? "";
  return `${tx}:${typ}:${cid}:${asset}:${side}:${ts}`;
}

export class ActivityPoller {
  private readonly store: ActivityStore;

  constructor(
    readonly targetWallet: string,
    readonly label: string,
    private readonly limit = 50
  ) {
    this.store = new ActivityStore(targetWallet);
  }

  get isBootstrapped(): boolean {
    return this.store.isBootstrapped;
  }

  async init(): Promise<void> {
    await this.store.init();
  }

  async fetchLatest(): Promise<ActivityEvent[]> {
    return fetchUserActivity(this.targetWallet, this.limit);
  }

  async bootstrap(events: ActivityEvent[]): Promise<number> {
    const keys = events.map(activityKey);
    await this.store.markManySeen(keys);
    await this.store.markBootstrapped();
    return this.store.size();
  }

  async newEvents(events: ActivityEvent[]): Promise<ActivityEvent[]> {
    const fresh: ActivityEvent[] = [];
    for (const ev of events) {
      const key = activityKey(ev);
      if (this.store.has(key)) continue;
      await this.store.markSeen(key);
      fresh.push(ev);
    }
    return fresh;
  }
}
