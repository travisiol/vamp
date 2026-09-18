"use client";

import { useQuery } from "@tanstack/react-query";
import type { LaunchCard, RecentVamps, WalletLaunches } from "./launches";
import { sampleVamps } from "./sample";

/**
 * vamps  — real vamps (tagged launches).
 * recent — nobody has been vamped yet: the latest real launches on Pons, to pick a source from.
 * sample — the chain could not be read at all; labeled placeholders.
 */
export type FeedMode = "vamps" | "recent" | "sample";

export type VampFeed = {
  cards: LaunchCard[];
  mode: FeedMode;
  /** Kept for callers that only care whether the cards are placeholders. */
  sample: boolean;
  scanned: RecentVamps["scanned"] | null;
  error: string | null;
};

export function useRecentVamps(limit = 24) {
  return useQuery<VampFeed>({
    queryKey: ["vamps", limit],
    queryFn: async () => {
      const r = await fetch(`/api/vamps?limit=${limit}`);
      const data = (await r.json()) as RecentVamps & { error?: string };
      if (!r.ok || data.error) return { cards: sampleVamps().slice(0, limit), mode: "sample", sample: true, scanned: null, error: data.error ?? `HTTP ${r.status}` };
      if (data.vamps.length) return { cards: data.vamps, mode: "vamps", sample: false, scanned: data.scanned, error: null };
      if (data.recent?.length) return { cards: data.recent, mode: "recent", sample: false, scanned: data.scanned, error: null };
      return { cards: sampleVamps().slice(0, limit), mode: "sample", sample: true, scanned: data.scanned, error: null };
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useWalletLaunches(wallet: string | undefined, extraTokens: string[]) {
  return useQuery<WalletLaunches>({
    queryKey: ["launches", wallet, extraTokens.join(",")],
    enabled: Boolean(wallet),
    queryFn: async () => {
      const qs = new URLSearchParams({ deployer: wallet! });
      if (extraTokens.length) qs.set("tokens", extraTokens.join(","));
      const r = await fetch(`/api/launches?${qs}`);
      const data = (await r.json()) as WalletLaunches & { error?: string };
      if (!r.ok || data.error) throw new Error(data.error ?? `HTTP ${r.status}`);
      return data;
    },
    staleTime: 20_000,
    refetchInterval: 45_000,
  });
}
