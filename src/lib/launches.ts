import { parseAbiItem, type Address, type Hex, type PublicClient } from "viem";
import { DASHBOARD_SCAN_BLOCKS, PONS, RECENT_SCAN_BLOCKS } from "@/config/contracts";
import { graduationProgress, marketCap } from "./curve";
import { curveAbi, factoryAbi, feeEscrowAbi, parseProvenanceTag, tokenMetaAbi, type Socials } from "./pons";
import { BLOCKS_PER_SECOND, publicClient } from "./robinhood";

/**
 * Server-side reads of what has been launched. Everything comes from
 * eth_getLogs on the official RPC (it answers wide, address-scoped ranges;
 * the explorer API sits behind Cloudflare) plus multicalls. No indexer.
 */

/** JSON-safe: bigints travel as decimal strings. */
export type CurveStats = {
  marketCapWei: string;
  volumeWei: string;
  creatorFeesWei: string;
  /** Fees still sitting on the curve (swept to the escrow by Pons, irregularly). */
  accruingWei: string;
  realQuoteWei: string;
  graduationWei: string;
  progress: number;
  graduated: boolean;
  trades: number;
};

export type LaunchCard = {
  token: Address;
  curve: Address;
  deployer: Address;
  /** `vamp:0x…` provenance tag, when the launch carries one. */
  source: Address | null;
  sourceName: string | null;
  sourceSymbol: string | null;
  sourceLogo: string | null;
  name: string;
  symbol: string;
  logo: string;
  description: string;
  socials: Socials;
  block: number;
  /** ms epoch, from the block timestamp. */
  launchedAt: number;
  tx: Hex | null;
  stats: CurveStats | null;
  /** Never true for chain data — the sample set flips it. */
  sample?: boolean;
};

type RawLaunch = { token: Address; curve: Address; deployer: Address; block: bigint; tx: Hex | null };

const tokenLaunched = factoryAbi.find((x) => x.type === "event" && x.name === "TokenLaunched")!;
const curveBuy = parseAbiItem("event CurveBuy(address indexed sender, address indexed recipient, uint256 quoteIn, uint256 tokensOut, uint256 fee, uint256 snipeTax)");
const curveSell = parseAbiItem("event CurveSell(address indexed sender, address indexed recipient, uint256 tokensIn, uint256 quoteOut, uint256 fee, uint256 snipeTax)");

/** The RPC refuses unfiltered ranges past roughly half a million blocks; chunk. */
const LOG_CHUNK = 400_000n;

export async function scanLaunches(client: PublicClient, fromBlock: bigint, toBlock: bigint, deployer?: Address): Promise<RawLaunch[]> {
  const out: RawLaunch[] = [];
  const step = deployer ? toBlock - fromBlock + 1n : LOG_CHUNK; // a topic filter is cheap over the whole history
  for (let start = fromBlock; start <= toBlock; start += step) {
    const end = start + step - 1n > toBlock ? toBlock : start + step - 1n;
    const logs = await client.getLogs({ address: PONS.factory, event: tokenLaunched, args: deployer ? { deployer } : undefined, fromBlock: start, toBlock: end });
    for (const l of logs) {
      if (!l.args.token || !l.args.curve || !l.args.deployer) continue;
      out.push({ token: l.args.token, curve: l.args.curve, deployer: l.args.deployer, block: l.blockNumber, tx: l.transactionHash });
    }
  }
  return out;
}

type Meta = { name: string; symbol: string; logo: string; description: string; socials: Socials };

/** name/symbol/logo/description/socials for many tokens, 5 calls each, in multicall chunks. */
export async function readTokenMeta(client: PublicClient, tokens: Address[]): Promise<Map<Address, Meta>> {
  const out = new Map<Address, Meta>();
  const fns = ["name", "symbol", "logo", "description", "socials"] as const;
  const CHUNK = 60; // 300 calls per multicall
  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK);
    const res = await client.multicall({
      allowFailure: true,
      contracts: chunk.flatMap((address) => fns.map((functionName) => ({ address, abi: tokenMetaAbi, functionName }))),
    });
    chunk.forEach((address, j) => {
      const r = (k: number) => res[j * fns.length + k];
      const str = (k: number) => (r(k).status === "success" && typeof r(k).result === "string" ? (r(k).result as string) : "");
      const s = r(4).status === "success" && Array.isArray(r(4).result) ? (r(4).result as readonly string[]) : [];
      out.set(address, {
        name: str(0),
        symbol: str(1),
        logo: str(2),
        description: str(3),
        socials: { twitter: s[0] ?? "", telegram: s[1] ?? "", discord: s[2] ?? "", website: s[3] ?? "", farcaster: s[4] ?? "" },
      });
    });
  }
  return out;
}

/** Live curve numbers plus trade volume from the curve's own events. */
export async function readCurveStats(client: PublicClient, curves: Address[], fromBlock: bigint, toBlock: bigint): Promise<Map<Address, CurveStats>> {
  const out = new Map<Address, CurveStats>();
  if (!curves.length) return out;
  const fns = ["getReserves", "realQuoteReserve", "graduationThreshold", "graduated", "quoteFeeBalance", "creatorTaxBalance", "launchSupply"] as const;
  const res = await client.multicall({
    allowFailure: true,
    contracts: curves.flatMap((address) => fns.map((functionName) => ({ address, abi: curveAbi, functionName }))),
  });

  // One eth_getLogs for every curve at once; group by address.
  const volume = new Map<string, { wei: bigint; trades: number }>();
  const addVol = (addr: string, wei: bigint) => {
    const cur = volume.get(addr.toLowerCase()) ?? { wei: 0n, trades: 0 };
    volume.set(addr.toLowerCase(), { wei: cur.wei + wei, trades: cur.trades + 1 });
  };
  const chunkedRanges: Array<[bigint, bigint]> = [];
  for (let start = fromBlock; start <= toBlock; start += LOG_CHUNK) chunkedRanges.push([start, start + LOG_CHUNK - 1n > toBlock ? toBlock : start + LOG_CHUNK - 1n]);
  for (const [start, end] of chunkedRanges) {
    const [buys, sells] = await Promise.all([
      client.getLogs({ address: curves, event: curveBuy, fromBlock: start, toBlock: end }).catch(() => []),
      client.getLogs({ address: curves, event: curveSell, fromBlock: start, toBlock: end }).catch(() => []),
    ]);
    for (const l of buys) addVol(l.address, l.args.quoteIn ?? 0n);
    for (const l of sells) addVol(l.address, l.args.quoteOut ?? 0n);
  }

  curves.forEach((address, j) => {
    const r = (k: number) => res[j * fns.length + k];
    if (r(0).status !== "success") return;
    const [quote, tokens] = r(0).result as readonly [bigint, bigint];
    const big = (k: number, d = 0n) => (r(k).status === "success" && typeof r(k).result === "bigint" ? (r(k).result as bigint) : d);
    const realQuote = big(1);
    const threshold = big(2);
    const graduated = r(3).status === "success" ? Boolean(r(3).result) : false;
    const quoteFee = big(4);
    const creatorTax = big(5);
    const supply = big(6, 1_000_000_000n * 10n ** 18n);
    const vol = volume.get(address.toLowerCase()) ?? { wei: 0n, trades: 0 };
    out.set(address, {
      marketCapWei: marketCap(quote, tokens, supply).toString(),
      volumeWei: vol.wei.toString(),
      creatorFeesWei: creatorTax.toString(),
      accruingWei: quoteFee.toString(),
      realQuoteWei: realQuote.toString(),
      graduationWei: threshold.toString(),
      progress: graduated ? 1 : graduationProgress(realQuote, threshold),
      graduated,
      trades: vol.trades,
    });
  });
  return out;
}

/** Block → ms, from the head's timestamp and the chain's steady 0.1 s cadence — no per-block fetch. */
function blockTime(head: { number: bigint; timestamp: bigint }, block: bigint): number {
  return Number(head.timestamp) * 1000 - (Number(head.number - block) * 1000) / BLOCKS_PER_SECOND;
}

async function toCards(client: PublicClient, raws: RawLaunch[], head: { number: bigint; timestamp: bigint }, withStats: boolean): Promise<LaunchCard[]> {
  if (!raws.length) return [];
  const meta = await readTokenMeta(client, raws.map((r) => r.token));
  const sources = Array.from(new Set(raws.map((r) => parseProvenanceTag(meta.get(r.token)?.socials.farcaster)).filter((a): a is Address => Boolean(a))));
  const sourceMeta = sources.length ? await readTokenMeta(client, sources) : new Map<Address, Meta>();
  const oldest = raws.reduce((m, r) => (r.block < m ? r.block : m), raws[0].block);
  const stats = withStats ? await readCurveStats(client, raws.map((r) => r.curve), oldest, head.number) : new Map<Address, CurveStats>();
  return raws.map((r) => {
    const m = meta.get(r.token);
    const source = parseProvenanceTag(m?.socials.farcaster);
    const sm = source ? sourceMeta.get(source) : undefined;
    return {
      token: r.token,
      curve: r.curve,
      deployer: r.deployer,
      source,
      sourceName: sm?.name ?? null,
      sourceSymbol: sm?.symbol ?? null,
      sourceLogo: sm?.logo ?? null,
      name: m?.name ?? "",
      symbol: m?.symbol ?? "",
      logo: m?.logo ?? "",
      description: m?.description ?? "",
      socials: m?.socials ?? { twitter: "", telegram: "", discord: "", website: "", farcaster: "" },
      block: Number(r.block),
      launchedAt: blockTime(head, r.block),
      tx: r.tx,
      stats: stats.get(r.curve) ?? null,
    };
  });
}

export type RecentVamps = {
  /** Launches carrying a provenance tag, newest first. */
  vamps: LaunchCard[];
  /** The newest launches on Pons regardless of tag — real tokens to vamp while nobody has been. */
  recent: LaunchCard[];
  scanned: { fromBlock: number; toBlock: number; launches: number };
  at: number;
};

let recentCache: { value: RecentVamps; at: number } | undefined;
let recentInflight: Promise<RecentVamps> | undefined;

/**
 * Launches carrying a provenance tag in the last RECENT_SCAN_BLOCKS blocks,
 * newest first, plus the newest launches of any kind — both with live stats.
 * Cached 45 s; one scan at a time.
 */
export async function recentVamps(limit = 24): Promise<RecentVamps> {
  if (recentCache && Date.now() - recentCache.at < 45_000) {
    return { ...recentCache.value, vamps: recentCache.value.vamps.slice(0, limit), recent: recentCache.value.recent.slice(0, limit) };
  }
  if (!recentInflight) {
    recentInflight = (async () => {
      const client = publicClient();
      const head = await client.getBlock();
      const fromBlock = head.number > RECENT_SCAN_BLOCKS ? head.number - RECENT_SCAN_BLOCKS : 0n;
      const raws = await scanLaunches(client, fromBlock, head.number);
      const meta = await readTokenMeta(client, raws.map((r) => r.token));
      const newestFirst = [...raws].sort((a, b) => (a.block > b.block ? -1 : 1));
      const tagged = newestFirst.filter((r) => parseProvenanceTag(meta.get(r.token)?.socials.farcaster));
      // Named tokens with an image first: the feed is a shop window for sources to vamp.
      const presentable = newestFirst.filter((r) => {
        const m = meta.get(r.token);
        return Boolean(m?.symbol && m.name && m.logo);
      });
      const [cards, recent] = await Promise.all([toCards(client, tagged.slice(0, 60), head, true), toCards(client, presentable.slice(0, 48), head, true)]);
      const value: RecentVamps = { vamps: cards, recent, scanned: { fromBlock: Number(fromBlock), toBlock: Number(head.number), launches: raws.length }, at: Date.now() };
      recentCache = { value, at: Date.now() };
      return value;
    })().finally(() => {
      recentInflight = undefined;
    });
  }
  const value = await recentInflight;
  return { ...value, vamps: value.vamps.slice(0, limit), recent: value.recent.slice(0, limit) };
}

export type WalletLaunches = {
  launches: LaunchCard[];
  claimableWei: string;
  at: number;
};

/** Every launch whose TokenLaunched.deployer is `wallet`, with stats, plus the escrow balance. */
export async function launchesByWallet(wallet: Address, extraTokens: Address[] = []): Promise<WalletLaunches> {
  const client = publicClient();
  const head = await client.getBlock();
  const fromBlock = head.number > DASHBOARD_SCAN_BLOCKS ? head.number - DASHBOARD_SCAN_BLOCKS : 0n;
  const raws = await scanLaunches(client, fromBlock, head.number, wallet);
  // Launches this browser made with another fee recipient are remembered locally and passed in.
  const known = new Set(raws.map((r) => r.token.toLowerCase()));
  const extra = extraTokens.filter((t) => !known.has(t.toLowerCase()));
  if (extra.length) {
    const found = await client.getLogs({ address: PONS.factory, event: tokenLaunched, fromBlock, toBlock: head.number, args: { token: extra } }).catch(() => []);
    for (const l of found) if (l.args.token && l.args.curve && l.args.deployer) raws.push({ token: l.args.token, curve: l.args.curve, deployer: l.args.deployer, block: l.blockNumber, tx: l.transactionHash });
  }
  raws.sort((a, b) => (a.block > b.block ? -1 : 1));
  const [launches, claimable] = await Promise.all([
    toCards(client, raws.slice(0, 50), head, true),
    client.readContract({ address: PONS.feeEscrow, abi: feeEscrowAbi, functionName: "balanceOf", args: [wallet] }).catch(() => 0n),
  ]);
  return { launches, claimableWei: claimable.toString(), at: Date.now() };
}
