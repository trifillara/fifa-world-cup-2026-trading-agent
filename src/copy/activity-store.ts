import {
  getRedisClient,
  isRedisEnabled,
} from "../integrations/redis";

const SEEN_PREFIX = "worldcup-bot:seen";
const BOOT_PREFIX = "worldcup-bot:bootstrapped";

function seenSetKey(wallet: string): string {
  return `${SEEN_PREFIX}:${wallet.toLowerCase()}`;
}

function bootKey(wallet: string): string {
  return `${BOOT_PREFIX}:${wallet.toLowerCase()}`;
}

export class ActivityStore {
  private readonly memory = new Set<string>();
  private bootstrapped = false;
  private readonly redis = isRedisEnabled();

  constructor(private readonly wallet: string) {}

  get isBootstrapped(): boolean {
    return this.bootstrapped;
  }

  async init(): Promise<void> {
    if (!this.redis) return;

    const client = getRedisClient();
    const [members, bootFlag] = await Promise.all([
      client.smembers(seenSetKey(this.wallet)),
      client.get(bootKey(this.wallet)),
    ]);

    for (const key of members) {
      this.memory.add(key);
    }
    this.bootstrapped = bootFlag === "1";
  }

  has(key: string): boolean {
    return this.memory.has(key);
  }

  async markSeen(key: string): Promise<void> {
    this.memory.add(key);
    if (!this.redis) return;
    await getRedisClient().sadd(seenSetKey(this.wallet), key);
  }

  async markBootstrapped(): Promise<void> {
    this.bootstrapped = true;
    if (!this.redis) return;
    await getRedisClient().set(bootKey(this.wallet), "1");
  }

  async markManySeen(keys: string[]): Promise<void> {
    for (const key of keys) {
      this.memory.add(key);
    }
    if (!this.redis || !keys.length) return;
    await getRedisClient().sadd(seenSetKey(this.wallet), ...keys);
  }

  size(): number {
    return this.memory.size;
  }
}
