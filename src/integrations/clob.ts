import { Wallet } from "ethers";
import {
  ClobClient,
  Chain,
  OrderType,
  Side,
  SignatureTypeV2,
  type TickSize,
} from "@polymarket/clob-client-v2";
interface ClobEthersSigner {
  getAddress(): Promise<string>;
  _signTypedData(
    domain: Record<string, unknown>,
    types: Record<string, Array<{ name: string; type: string }>>,
    value: Record<string, unknown>
  ): Promise<string>;
}
import {
  POLYMARKET_FUNDER_ADDRESS,
  POLYMARKET_PRIVATE_KEY,
  POLYMARKET_SIGNATURE_TYPE,
} from "../config/env";
import { pulse } from "../cli/terminal";

export const HOST = "https://clob.polymarket.com";
export const CHAIN_ID = Chain.POLYGON;

const SIGNATURE_TYPE_BY_NAME = {
  EOA: SignatureTypeV2.EOA,
  POLY_PROXY: SignatureTypeV2.POLY_PROXY,
  POLY_GNOSIS_SAFE: SignatureTypeV2.POLY_GNOSIS_SAFE,
  POLY_1271: SignatureTypeV2.POLY_1271,
} as const;

export function resolveSignatureType(): SignatureTypeV2 {
  const raw = POLYMARKET_SIGNATURE_TYPE?.trim();
  if (!raw) return SignatureTypeV2.POLY_PROXY;
  const resolved =
    SIGNATURE_TYPE_BY_NAME[raw as keyof typeof SIGNATURE_TYPE_BY_NAME];
  if (resolved === undefined) {
    throw new Error(
      `Invalid POLYMARKET_SIGNATURE_TYPE: ${raw}. Valid: ${Object.keys(SIGNATURE_TYPE_BY_NAME).join(", ")}`
    );
  }
  return resolved;
}

export function createSigner(): ClobEthersSigner | null {
  if (!POLYMARKET_PRIVATE_KEY) return null;
  const wallet = new Wallet(POLYMARKET_PRIVATE_KEY);
  return {
    getAddress: () => wallet.getAddress(),
    _signTypedData(domain, types, value) {
      return wallet.signTypedData(
        domain as never,
        types as never,
        value as never
      );
    },
  };
}

function asTickSize(value: string): TickSize {
  const allowed: TickSize[] = ["0.1", "0.01", "0.001", "0.0001"];
  if (allowed.includes(value as TickSize)) return value as TickSize;
  return "0.01";
}

let cachedClient: ClobClient | null = null;

export async function getTradingClient(): Promise<ClobClient> {
  if (cachedClient) return cachedClient;

  const signer = createSigner();
  if (!signer) {
    throw new Error("POLYMARKET_PRIVATE_KEY is required for trading.");
  }

  const signatureType = resolveSignatureType();
  const candidates = [signatureType];
  if (!POLYMARKET_SIGNATURE_TYPE) {
    candidates.push(SignatureTypeV2.POLY_PROXY, SignatureTypeV2.EOA);
  }

  let apiKey: Awaited<ReturnType<ClobClient["createOrDeriveApiKey"]>> | null =
    null;
  let activeType = signatureType;
  let lastError: unknown = null;

  for (const candidate of candidates) {
    try {
      const config: ConstructorParameters<typeof ClobClient>[0] = {
        host: HOST,
        chain: CHAIN_ID,
        signer,
        signatureType: candidate,
      };
      if (candidate !== SignatureTypeV2.EOA) {
        config.funderAddress = POLYMARKET_FUNDER_ADDRESS;
      }
      const temp = new ClobClient(config);
      try {
        apiKey = await temp.deriveApiKey();
      } catch {
        apiKey = await temp.createApiKey();
      }
      activeType = candidate;
      pulse.ok("clob", `authenticated (${SignatureTypeV2[candidate]})`);
      break;
    } catch (error) {
      lastError = error;
      pulse.warn("clob", `auth failed for ${SignatureTypeV2[candidate]}`);
    }
  }

  if (!apiKey) {
    throw new Error(
      `Unable to authenticate CLOB client: ${String(lastError)}`
    );
  }

  cachedClient = new ClobClient({
    host: HOST,
    chain: CHAIN_ID,
    signer,
    creds: apiKey,
    signatureType: activeType,
    ...(activeType !== SignatureTypeV2.EOA
      ? { funderAddress: POLYMARKET_FUNDER_ADDRESS }
      : {}),
  });

  return cachedClient;
}

export async function getMarketPrice(
  tokenId: string,
  side: "BUY" | "SELL"
): Promise<number> {
  const response = await fetch(
    `${HOST}/price?token_id=${encodeURIComponent(tokenId)}&side=${side}`
  );
  if (!response.ok) {
    throw new Error(`Price API failed: ${response.status}`);
  }
  const data = (await response.json()) as { price?: string | number };
  return Number(data.price ?? 0);
}

export async function placeMarketBuyUsd(
  tokenId: string,
  usd: number,
  tickSize: string,
  negRisk: boolean,
  dryRun: boolean
): Promise<{ orderId: string; status: string; price: number }> {
  const ask = await getMarketPrice(tokenId, "BUY");
  if (ask <= 0 || ask >= 1) {
    throw new Error(`Invalid ask price ${ask} for token ${tokenId}`);
  }

  const price = Math.min(ask + 0.01, 0.99);

  if (dryRun) {
    pulse.trade(
      `[dry-run] BUY $${usd.toFixed(2)} @ ~${price.toFixed(3)} token=${tokenId.slice(0, 12)}…`
    );
    return { orderId: "dry-run", status: "simulated", price };
  }

  const client = await getTradingClient();
  const response = await client.createAndPostMarketOrder(
    {
      tokenID: tokenId,
      amount: usd,
      side: Side.BUY,
      price,
    },
    { tickSize: asTickSize(tickSize), negRisk },
    OrderType.FOK
  );

  const orderId =
    (response as { orderID?: string }).orderID ??
    (response as { order_id?: string }).order_id ??
    "unknown";

  pulse.trade(`BUY $${usd.toFixed(2)} order=${orderId}`);

  return {
    orderId,
    status: (response as { status?: string }).status ?? "submitted",
    price,
  };
}
