"use client";

import { useQuery } from "@tanstack/react-query";
import type { EthPrice } from "./prices";

/** ETH/USD from /api/price (fresh Pyth print or Coinbase spot); null when unavailable, `stale` when old. */
export function useEthPrice() {
  return useQuery<EthPrice | null>({
    queryKey: ["eth-usd"],
    queryFn: async () => {
      const r = await fetch("/api/price");
      if (!r.ok) return null;
      return ((await r.json()) as { price: EthPrice | null }).price;
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
