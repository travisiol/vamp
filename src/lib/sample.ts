import { keccak256, stringToHex, type Address } from "viem";
import type { LaunchCard } from "./launches";

/**
 * Sample data. Shown only when the chain has nothing to show yet, and every
 * surface that renders it says "sample" out loud. Addresses are hashes of
 * the names — they look like addresses and lead nowhere on purpose.
 */

const fakeAddress = (seed: string): Address => `0x${keccak256(stringToHex(`vamp-sample:${seed}`)).slice(26)}` as Address;

type Seed = { name: string; symbol: string; source: string; sourceSymbol: string; minutesAgo: number; mcEth: number; volEth: number; feesEth: number; progress: number };

const seeds: Seed[] = [
  { name: "Nocturne", symbol: "NOCT", source: "Stockr", sourceSymbol: "STOCK", minutesAgo: 2, mcEth: 3.1, volEth: 4.8, feesEth: 0.031, progress: 0.34 },
  { name: "Velvet", symbol: "VLVT", source: "Hoodie", sourceSymbol: "HOOD", minutesAgo: 9, mcEth: 2.4, volEth: 2.2, feesEth: 0.014, progress: 0.18 },
  { name: "Crimson", symbol: "CRMS", source: "Moonlit", sourceSymbol: "MOON", minutesAgo: 27, mcEth: 6.7, volEth: 12.5, feesEth: 0.11, progress: 0.71 },
  { name: "Sable", symbol: "SABL", source: "Stockr", sourceSymbol: "STOCK", minutesAgo: 41, mcEth: 1.9, volEth: 1.1, feesEth: 0.006, progress: 0.09 },
  { name: "Requiem", symbol: "RQM", source: "Orbiter", sourceSymbol: "ORB", minutesAgo: 66, mcEth: 9.8, volEth: 31.2, feesEth: 0.29, progress: 1 },
  { name: "Garnet", symbol: "GRNT", source: "Moonlit", sourceSymbol: "MOON", minutesAgo: 95, mcEth: 2.1, volEth: 1.6, feesEth: 0.012, progress: 0.13 },
  { name: "Moth", symbol: "MOTH", source: "Lantern", sourceSymbol: "LMP", minutesAgo: 140, mcEth: 4.4, volEth: 6.9, feesEth: 0.052, progress: 0.46 },
  { name: "Orchid", symbol: "ORCD", source: "Hoodie", sourceSymbol: "HOOD", minutesAgo: 210, mcEth: 2.9, volEth: 3.3, feesEth: 0.021, progress: 0.24 },
];

const eth = (n: number) => BigInt(Math.round(n * 1e6)) * 10n ** 12n;

export function sampleVamps(now = Date.now()): LaunchCard[] {
  return seeds.map((s) => ({
    token: fakeAddress(`token:${s.symbol}`),
    curve: fakeAddress(`curve:${s.symbol}`),
    deployer: fakeAddress(`deployer:${s.symbol}`),
    source: fakeAddress(`source:${s.source}`),
    sourceName: s.source,
    sourceSymbol: s.sourceSymbol,
    sourceLogo: "",
    name: s.name,
    symbol: s.symbol,
    logo: "",
    description: `${s.name} is a sample vamp of ${s.source}.`,
    socials: { twitter: "", telegram: "", discord: "", website: "", farcaster: `vamp:${fakeAddress(`source:${s.source}`)}` },
    block: 0,
    launchedAt: now - s.minutesAgo * 60_000,
    tx: null,
    stats: {
      marketCapWei: eth(s.mcEth).toString(),
      volumeWei: eth(s.volEth).toString(),
      creatorFeesWei: eth(s.feesEth).toString(),
      accruingWei: eth(s.feesEth / 3).toString(),
      realQuoteWei: eth(4.2 * s.progress).toString(),
      graduationWei: eth(4.2).toString(),
      progress: s.progress,
      graduated: s.progress >= 1,
      trades: Math.round(s.volEth * 23),
    },
    sample: true,
  }));
}

/** The dashboard when no wallet is connected: the numbers from the brief, labeled as a sample. */
export const sampleCoven = {
  totalVamps: 12,
  claimableEth: 1.28,
  totalVolumeUsd: 142_812,
  activeCurves: 4,
};
