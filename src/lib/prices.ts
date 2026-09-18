import type { PublicClient } from "viem";
import { PYTH } from "@/config/contracts";
import { publicClient } from "./robinhood";

const pythAbi = [
  {
    type: "function",
    name: "getPriceUnsafe",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "price", type: "int64" },
          { name: "conf", type: "uint64" },
          { name: "expo", type: "int32" },
          { name: "publishTime", type: "uint256" },
        ],
      },
    ],
  },
] as const;

export type EthPrice = { usd: number; publishedAt: number; stale: boolean; source: "pyth" | "coinbase" };

/** Prices older than this are shown as ETH only. */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

let cached: { value: EthPrice | null; at: number } | undefined;

/**
 * ETH/USD from the Pyth contract on Robinhood Chain — the last price anyone
 * pushed on chain (no Hermes key needed). `stale` when older than six hours;
 * callers then omit the dollar figure rather than print a wrong one.
 */
export async function readEthUsd(client: PublicClient = publicClient()): Promise<EthPrice | null> {
  if (cached && Date.now() - cached.at < 60_000) return cached.value;
  try {
    const p = await client.readContract({ address: PYTH.address, abi: pythAbi, functionName: "getPriceUnsafe", args: [PYTH.ethUsdFeed] });
    const usd = Number(p.price) * 10 ** p.expo;
    const publishedAt = Number(p.publishTime) * 1000;
    const value: EthPrice | null = Number.isFinite(usd) && usd > 0 ? { usd, publishedAt, stale: Date.now() - publishedAt > MAX_AGE_MS, source: "pyth" } : null;
    cached = { value, at: Date.now() };
    return value;
  } catch {
    cached = { value: null, at: Date.now() };
    return null;
  }
}

export function ethToUsd(wei: bigint, price: EthPrice | null | undefined): number | null {
  if (!price || price.stale) return null;
  return (Number(wei) / 1e18) * price.usd;
}

/**
 * Server side: the on-chain Pyth print when it is fresh, otherwise Coinbase's
 * public spot price (no key). Null when neither answers — the UI then shows
 * ETH figures only, never a made-up dollar.
 */
export async function ethUsdForDisplay(): Promise<EthPrice | null> {
  const onChain = await readEthUsd();
  if (onChain && !onChain.stale) return onChain;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch("https://api.coinbase.com/v2/prices/ETH-USD/spot", { signal: ctl.signal, next: { revalidate: 60 } });
    clearTimeout(timer);
    const data = (await r.json()) as { data?: { amount?: string } };
    const usd = Number(data.data?.amount);
    if (Number.isFinite(usd) && usd > 0) return { usd, publishedAt: Date.now(), stale: false, source: "coinbase" };
  } catch {
    /* fall through */
  }
  return onChain;
}
