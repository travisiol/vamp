import { createPublicClient, defineChain, fallback, http, type PublicClient } from "viem";
import { CHAIN_ID, EXPLORER_URL, MULTICALL3, PONS_APP_URL, RPC_FALLBACKS, RPC_URL } from "@/config/contracts";

/**
 * Robinhood Chain — an Arbitrum Orbit chain, id 4663, ~0.1 s blocks, ETH gas.
 * Everything here is driven by src/config/contracts.ts.
 */
export const robinhoodChain = defineChain({
  id: CHAIN_ID,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL, ...RPC_FALLBACKS] } },
  blockExplorers: { default: { name: "Robinhood Chain explorer", url: EXPLORER_URL } },
  contracts: { multicall3: { address: MULTICALL3 } },
  testnet: false,
});

/** Blocks per second on Robinhood Chain — used to turn a block distance into "2m ago" without fetching every block. */
export const BLOCKS_PER_SECOND = 10;

let client: PublicClient | undefined;

/**
 * One shared read client. The official RPC first (it answers wide
 * eth_getLogs); publicnode only as a fallback for plain reads.
 */
export function publicClient(): PublicClient {
  if (!client) {
    client = createPublicClient({
      chain: robinhoodChain,
      transport: fallback(
        [http(RPC_URL, { batch: true, timeout: 20_000, retryCount: 2 }), ...RPC_FALLBACKS.map((u) => http(u, { batch: true, timeout: 15_000, retryCount: 1 }))],
        { rank: false },
      ),
    }) as PublicClient;
  }
  return client;
}

export const explorer = {
  address: (a: string) => `${EXPLORER_URL}/address/${a}`,
  token: (a: string) => `${EXPLORER_URL}/token/${a}`,
  tx: (h: string) => `${EXPLORER_URL}/tx/${h}`,
};

export const pons = {
  token: (a: string) => `${PONS_APP_URL}/launchpad/${a}`,
};
