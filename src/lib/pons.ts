import { getAddress, isAddress, parseEther, parseEventLogs, zeroAddress, type Address, type Hex, type PublicClient, type TransactionReceipt } from "viem";
import { PONS } from "@/config/contracts";
import { quoteBuy, withSlippage } from "./curve";
import { publicClient } from "./robinhood";

// ---------------------------------------------------------------------------
// ABIs — only what VAMP calls. Selectors and layouts were verified on chain
// (see src/config/contracts.ts); the LaunchParams struct is shared by the
// factory and the launch forwarder.
// ---------------------------------------------------------------------------

const socialsComponents = [
  { name: "twitter", type: "string" },
  { name: "telegram", type: "string" },
  { name: "discord", type: "string" },
  { name: "website", type: "string" },
  { name: "farcaster", type: "string" },
] as const;

const launchParamsComponents = [
  { name: "name", type: "string" },
  { name: "symbol", type: "string" },
  { name: "logo", type: "string" },
  { name: "description", type: "string" },
  { name: "socials", type: "tuple", components: socialsComponents },
  /** Who receives creator fees. NOT the pair token. */
  { name: "creatorFeeRecipient", type: "address" },
  { name: "creatorTaxBps", type: "uint16" },
  { name: "buybackEnabled", type: "bool" },
  /** factory.previewLaunchEconomics(configId, pairToken), read right before launching. */
  { name: "expectedEconomics", type: "bytes32" },
  { name: "salt", type: "bytes32" },
] as const;

const tokenLaunchedEvent = {
  type: "event",
  name: "TokenLaunched",
  inputs: [
    { name: "token", type: "address", indexed: true },
    { name: "curve", type: "address", indexed: true },
    { name: "deployer", type: "address", indexed: true },
    { name: "pairToken", type: "address", indexed: false },
    { name: "launchConfigId", type: "uint256", indexed: false },
    { name: "graduationThreshold", type: "uint256", indexed: false },
  ],
} as const;

export const factoryAbi = [
  {
    type: "function",
    name: "launchToken",
    stateMutability: "payable",
    inputs: [
      { name: "params", type: "tuple", components: launchParamsComponents },
      { name: "launchConfigId", type: "uint256" },
      { name: "pairToken", type: "address" },
      { name: "snipeTaxExemptions", type: "address[]" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "curve", type: "address" },
    ],
  },
  { type: "function", name: "launchFee", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "launchEnabled", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "canLaunch", stateMutability: "view", inputs: [{ name: "launcher", type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "maxCreatorTaxBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "snipeTaxStartBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "snipeTaxSeconds", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "previewLaunchEconomics",
    stateMutability: "view",
    inputs: [
      { name: "launchConfigId", type: "uint256" },
      { name: "pairToken", type: "address" },
    ],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "getLaunchConfig",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "supply", type: "uint256" },
          { name: "curveFeeBps", type: "uint256" },
          { name: "phantomQuote", type: "uint256" },
          { name: "graduationThreshold", type: "uint256" },
          { name: "poolFee", type: "uint24" },
          { name: "tickSpacing", type: "int24" },
          { name: "enabled", type: "bool" },
        ],
      },
    ],
  },
  tokenLaunchedEvent,
  { type: "error", name: "LaunchEconomicsMismatch", inputs: [{ type: "bytes32" }, { type: "bytes32" }] },
  { type: "error", name: "ExemptionListTooLong", inputs: [] },
  { type: "error", name: "PairTokenNotApproved", inputs: [] },
] as const;

export const forwarderAbi = [
  {
    type: "function",
    name: "launchAndBuy",
    stateMutability: "payable",
    inputs: [
      { name: "params", type: "tuple", components: launchParamsComponents },
      { name: "launchConfigId", type: "uint256" },
      { name: "pairToken", type: "address" },
      { name: "quoteIn", type: "uint256" },
      { name: "minTokensOut", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "snipeTaxExemptions", type: "address[]" },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "curve", type: "address" },
      { name: "tokensOut", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "Launched",
    inputs: [
      { name: "token", type: "address", indexed: true },
      { name: "curve", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "launcher", type: "address", indexed: false },
      { name: "quoteSpent", type: "uint256", indexed: false },
      { name: "tokensReceived", type: "uint256", indexed: false },
    ],
  },
  tokenLaunchedEvent,
  { type: "error", name: "ZeroAmount", inputs: [] },
  { type: "error", name: "NotApprovedLauncher", inputs: [] },
  { type: "error", name: "LaunchEconomicsMismatch", inputs: [{ type: "bytes32" }, { type: "bytes32" }] },
] as const;

/** A Pons V2 launcher token keeps its metadata on the contract itself. */
export const tokenMetaAbi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "logo", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "description", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "socials", stateMutability: "view", inputs: [], outputs: socialsComponents },
  { type: "function", name: "deployer", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "curve", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

export const curveAbi = [
  { type: "function", name: "getReserves", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }, { type: "uint256" }] },
  { type: "function", name: "realQuoteReserve", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "graduationThreshold", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "graduated", stateMutability: "view", inputs: [], outputs: [{ type: "bool" }] },
  { type: "function", name: "launchedAt", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "launchSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "feeBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "creatorTaxBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "quoteFeeBalance", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "creatorTaxBalance", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "protocolFeeShareBps", stateMutability: "view", inputs: [], outputs: [{ type: "uint16" }] },
  { type: "function", name: "deployer", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  {
    type: "event",
    name: "CurveBuy",
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "quoteIn", type: "uint256", indexed: false },
      { name: "tokensOut", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
      { name: "snipeTax", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CurveSell",
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "tokensIn", type: "uint256", indexed: false },
      { name: "quoteOut", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
      { name: "snipeTax", type: "uint256", indexed: false },
    ],
  },
] as const;

/** Creator fees swept off the curves wait here. `claim()` pays msg.sender. */
export const feeEscrowAbi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "recipient", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "error", name: "NoBalance", inputs: [] },
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Socials = { twitter: string; telegram: string; discord: string; website: string; farcaster: string };
export const EMPTY_SOCIALS: Socials = { twitter: "", telegram: "", discord: "", website: "", farcaster: "" };

export type SourceKind = "pons-v2" | "pons-meta" | "erc20";

export type SourceToken = {
  address: Address;
  kind: SourceKind;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint | null;
  logo: string;
  description: string;
  socials: Socials;
  deployer: Address | null;
  curve: Address | null;
  graduated: boolean | null;
  /** If the source is itself a vamp, where it came from. */
  vampedFrom: Address | null;
};

export type FactoryEconomics = {
  launchFee: bigint;
  launchEnabled: boolean;
  maxCreatorTaxBps: number;
  snipeTaxStartBps: number;
  snipeTaxSeconds: number;
  economicsHash: Hex;
  supply: bigint;
  curveFeeBps: bigint;
  phantomQuote: bigint;
  graduationThreshold: bigint;
  readAt: number;
};

export type VampDraft = {
  name: string;
  symbol: string;
  description: string;
  logo: string;
  socials: Socials;
  /** ETH, as typed. */
  devBuyEth: string;
  /** Creator fee recipient; empty = the connected wallet. */
  creatorWallet: string;
  /** Percent, 0..10. */
  creatorTaxPct: number;
  buybackEnabled: boolean;
  snipeExemptions: string[];
  /** Write `vamp:0x…` into the farcaster slot so the lineage is on chain. */
  tagProvenance: boolean;
};

// ---------------------------------------------------------------------------
// Provenance — the lineage lives on chain, in the farcaster social slot
// (Pons never displays it). "vamp:0x<source>" is what the network map and
// the "They've been vamped" grid look for.
// ---------------------------------------------------------------------------

export const provenanceTag = (source: Address) => `vamp:${source}`;

export function parseProvenanceTag(value: string | undefined | null): Address | null {
  const m = /^vamp:(0x[0-9a-fA-F]{40})$/.exec((value ?? "").trim());
  return m ? normalizeAddress(m[1]) : null;
}

/** Any case accepted; a wrong checksum is a carelessly typed address, not garbage. */
export function normalizeAddress(input: string | undefined | null): Address | null {
  const raw = (input ?? "").trim();
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return null;
  const lower = raw.toLowerCase();
  return isAddress(lower) ? getAddress(lower) : null;
}

export function parseEthAmount(input: string): bigint | null {
  const v = (input ?? "").trim().replace(",", ".");
  if (!v) return 0n;
  if (!/^\d*\.?\d*$/.test(v) || v === ".") return null;
  try {
    return parseEther(v);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Reading the source token
// ---------------------------------------------------------------------------

export class SourceReadError extends Error {
  readonly code: "invalid" | "no-contract" | "not-erc20" | "network";
  constructor(message: string, code: "invalid" | "no-contract" | "not-erc20" | "network") {
    super(message);
    this.code = code;
  }
}

const isNetworkFailure = (r: PromiseSettledResult<unknown>) =>
  r.status === "rejected" &&
  /HttpRequestError|TimeoutError|Failed to fetch|HTTP request failed|NetworkError|rate limit|429/i.test(
    `${(r.reason as { name?: string })?.name ?? ""} ${(r.reason as { shortMessage?: string })?.shortMessage ?? ""} ${(r.reason as Error)?.message ?? ""}`,
  );

/**
 * Everything a token exposes on chain. Pons V2 tokens carry logo, description
 * and socials on the contract; any other ERC-20 gives name and symbol.
 */
export async function readSourceToken(input: string, client: PublicClient = publicClient()): Promise<SourceToken> {
  const address = normalizeAddress(input);
  if (!address) throw new SourceReadError("That is not a contract address. 0x followed by 40 hex characters.", "invalid");

  const code = await client.getCode({ address }).catch(() => undefined);
  if (code === undefined) throw new SourceReadError("Could not reach Robinhood Chain. Check the connection and try again.", "network");
  if (!code || code === "0x") throw new SourceReadError("No contract at this address on Robinhood Chain. A token from another chain?", "no-contract");

  const rc = <F extends (typeof tokenMetaAbi)[number]["name"]>(functionName: F) =>
    client.readContract({ address, abi: tokenMetaAbi, functionName } as never) as Promise<unknown>;

  const settled = await Promise.allSettled([rc("name"), rc("symbol"), rc("decimals"), rc("totalSupply"), rc("logo"), rc("description"), rc("socials"), rc("deployer"), rc("curve")]);
  const v = (i: number) => (settled[i].status === "fulfilled" ? (settled[i] as PromiseFulfilledResult<unknown>).value : undefined);
  const name = v(0), symbol = v(1), decimals = v(2), totalSupply = v(3), logo = v(4), description = v(5), socialsRaw = v(6), deployer = v(7), curve = v(8);

  if (settled.every(isNetworkFailure)) throw new SourceReadError("Could not reach Robinhood Chain to read this token. Try again in a moment.", "network");
  if (typeof name !== "string" && typeof symbol !== "string") throw new SourceReadError("This contract does not look like a token: no name() and no symbol().", "not-erc20");

  const socials: Socials = { ...EMPTY_SOCIALS };
  if (Array.isArray(socialsRaw) && socialsRaw.length === 5) {
    const [twitter, telegram, discord, website, farcaster] = socialsRaw as string[];
    Object.assign(socials, { twitter: twitter || "", telegram: telegram || "", discord: discord || "", website: website || "", farcaster: farcaster || "" });
  }

  const hasMeta = typeof logo === "string";
  const curveAddress = typeof curve === "string" && curve !== zeroAddress ? (curve as Address) : null;
  const kind: SourceKind = hasMeta && curveAddress ? "pons-v2" : hasMeta ? "pons-meta" : "erc20";

  let graduated: boolean | null = null;
  if (curveAddress) {
    graduated = await client.readContract({ address: curveAddress, abi: curveAbi, functionName: "graduated" }).catch(() => null);
  }

  return {
    address,
    kind,
    name: typeof name === "string" ? name : "",
    symbol: typeof symbol === "string" ? symbol : "",
    decimals: typeof decimals === "number" ? decimals : 18,
    totalSupply: typeof totalSupply === "bigint" ? totalSupply : null,
    logo: hasMeta ? (logo as string) : "",
    description: typeof description === "string" ? description : "",
    socials,
    deployer: typeof deployer === "string" ? (deployer as Address) : null,
    curve: curveAddress,
    graduated,
    vampedFrom: parseProvenanceTag(socials.farcaster),
  };
}

/** Everything the preview shows live from the factory, in one multicall. */
export async function readFactoryEconomics(client: PublicClient = publicClient()): Promise<FactoryEconomics> {
  const f = { address: PONS.factory, abi: factoryAbi } as const;
  const [launchFee, launchEnabled, maxTax, snipeStart, snipeSeconds, economicsHash, config] = await client.multicall({
    allowFailure: false,
    contracts: [
      { ...f, functionName: "launchFee" },
      { ...f, functionName: "launchEnabled" },
      { ...f, functionName: "maxCreatorTaxBps" },
      { ...f, functionName: "snipeTaxStartBps" },
      { ...f, functionName: "snipeTaxSeconds" },
      { ...f, functionName: "previewLaunchEconomics", args: [PONS.launchConfigId, PONS.pairToken] },
      { ...f, functionName: "getLaunchConfig", args: [PONS.launchConfigId] },
    ],
  });
  return {
    launchFee,
    launchEnabled,
    maxCreatorTaxBps: Number(maxTax),
    snipeTaxStartBps: Number(snipeStart),
    snipeTaxSeconds: Number(snipeSeconds),
    economicsHash,
    supply: config.supply,
    curveFeeBps: config.curveFeeBps,
    phantomQuote: config.phantomQuote,
    graduationThreshold: config.graduationThreshold,
    readAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Building the launch
// ---------------------------------------------------------------------------

export type LaunchCall =
  | {
      kind: "factory";
      address: Address;
      abi: typeof factoryAbi;
      functionName: "launchToken";
      args: readonly [LaunchParams, bigint, Address, readonly Address[]];
      value: bigint;
      devBuy: 0n;
      minTokensOut: 0n;
      params: LaunchParams;
    }
  | {
      kind: "forwarder";
      address: Address;
      abi: typeof forwarderAbi;
      functionName: "launchAndBuy";
      args: readonly [LaunchParams, bigint, Address, bigint, bigint, Address, readonly Address[]];
      value: bigint;
      devBuy: bigint;
      minTokensOut: bigint;
      params: LaunchParams;
    };

export type LaunchParams = {
  name: string;
  symbol: string;
  logo: string;
  description: string;
  socials: Socials;
  creatorFeeRecipient: Address;
  creatorTaxBps: number;
  buybackEnabled: boolean;
  expectedEconomics: Hex;
  salt: Hex;
};

export class LaunchBuildError extends Error {}

function randomSalt(): Hex {
  const b = new Uint8Array(32);
  globalThis.crypto.getRandomValues(b);
  return `0x${Array.from(b, (n) => n.toString(16).padStart(2, "0")).join("")}` as Hex;
}

const clean = (s: string | undefined) => (typeof s === "string" ? s.trim() : "");

/**
 * The exact transaction for a draft. Dev buy > 0 goes through the launch
 * forwarder (create + buy, atomic); otherwise the factory directly.
 * `minTokensOut` is the worst case (curve fee + creator tax taken from the
 * input) less 3 %, so it can only be beaten, never missed.
 */
export function buildLaunchCall(draft: VampDraft, account: Address, source: Address | null, eco: FactoryEconomics): LaunchCall {
  const name = clean(draft.name);
  const symbol = clean(draft.symbol);
  if (!name) throw new LaunchBuildError("The token needs a name.");
  if (!symbol) throw new LaunchBuildError("The token needs a ticker.");
  if (name.length > 64) throw new LaunchBuildError("Name: 64 characters maximum.");
  if (symbol.length > 16) throw new LaunchBuildError("Ticker: 16 characters maximum.");

  const feeRecipient = clean(draft.creatorWallet) ? normalizeAddress(draft.creatorWallet) : account;
  if (!feeRecipient) throw new LaunchBuildError("Creator wallet is not a valid address.");

  const taxPct = Number(draft.creatorTaxPct ?? 0);
  const maxPct = eco.maxCreatorTaxBps / 100;
  if (!Number.isFinite(taxPct) || taxPct < 0 || taxPct > maxPct) throw new LaunchBuildError(`Creator tax must be between 0 and ${maxPct}%.`);
  const creatorTaxBps = Math.round(taxPct * 100);

  const devBuy = parseEthAmount(draft.devBuyEth);
  if (devBuy === null) throw new LaunchBuildError("Developer buy is not a valid amount.");
  const useForwarder = devBuy > 0n;

  const seen = new Set<string>();
  const exemptions: Address[] = [];
  for (const raw of draft.snipeExemptions ?? []) {
    if (!clean(raw)) continue;
    const a = normalizeAddress(raw);
    if (!a) throw new LaunchBuildError(`Snipe exemption "${clean(raw).slice(0, 20)}…" is not an address.`);
    if (useForwarder && a.toLowerCase() === account.toLowerCase()) continue; // the forwarder adds the buyer itself
    if (seen.has(a.toLowerCase())) continue;
    seen.add(a.toLowerCase());
    exemptions.push(a);
  }
  const cap = useForwarder ? PONS.maxExemptions - 1 : PONS.maxExemptions;
  if (exemptions.length > cap) throw new LaunchBuildError(`${cap} snipe exemptions maximum${useForwarder ? " with a dev buy" : ""}.`);

  if (!eco.economicsHash || /^0x0+$/.test(eco.economicsHash)) throw new LaunchBuildError("Could not read the launch economics from Pons. Try again.");

  let farcaster = clean(draft.socials?.farcaster);
  if (draft.tagProvenance && source) farcaster = provenanceTag(source);

  const params: LaunchParams = {
    name,
    symbol,
    logo: clean(draft.logo),
    description: clean(draft.description),
    socials: {
      twitter: clean(draft.socials?.twitter),
      telegram: clean(draft.socials?.telegram),
      discord: clean(draft.socials?.discord),
      website: clean(draft.socials?.website),
      farcaster,
    },
    creatorFeeRecipient: feeRecipient,
    creatorTaxBps,
    buybackEnabled: Boolean(draft.buybackEnabled),
    expectedEconomics: eco.economicsHash,
    salt: randomSalt(),
  };

  if (useForwarder) {
    const worst = quoteBuy(eco.phantomQuote, eco.supply, devBuy, eco.curveFeeBps + BigInt(creatorTaxBps));
    const minTokensOut = withSlippage(worst, 300n);
    return {
      kind: "forwarder",
      address: PONS.launchForwarder,
      abi: forwarderAbi,
      functionName: "launchAndBuy",
      args: [params, PONS.launchConfigId, PONS.pairToken, devBuy, minTokensOut, account, exemptions] as const,
      value: eco.launchFee + devBuy,
      devBuy,
      minTokensOut,
      params,
    };
  }
  return {
    kind: "factory",
    address: PONS.factory,
    abi: factoryAbi,
    functionName: "launchToken",
    args: [params, PONS.launchConfigId, PONS.pairToken, exemptions] as const,
    value: eco.launchFee,
    devBuy: 0n,
    minTokensOut: 0n,
    params,
  };
}

export type LaunchResult = {
  hash: Hex;
  token: Address;
  curve: Address;
  deployer: Address;
  tokensOut: bigint | null;
  devBuy: bigint;
  blockNumber: bigint;
  source: Address | null;
  name: string;
  symbol: string;
  logo: string;
  launchedAt: number;
};

/** The launched token and curve, straight from the receipt's TokenLaunched event. */
export function parseLaunchReceipt(receipt: TransactionReceipt, call: LaunchCall, source: Address | null): Omit<LaunchResult, "launchedAt"> {
  const launched = parseEventLogs({ abi: factoryAbi, eventName: "TokenLaunched", logs: receipt.logs });
  const ev = launched[0]?.args;
  if (!ev) throw new Error("The transaction was mined but no TokenLaunched event was found in it.");
  let tokensOut: bigint | null = null;
  if (call.kind === "forwarder") {
    const bought = parseEventLogs({ abi: forwarderAbi, eventName: "Launched", logs: receipt.logs });
    tokensOut = bought[0]?.args?.tokensReceived ?? null;
  }
  return {
    hash: receipt.transactionHash,
    token: ev.token,
    curve: ev.curve,
    deployer: ev.deployer,
    tokensOut,
    devBuy: call.devBuy,
    blockNumber: receipt.blockNumber,
    source,
    name: call.params.name,
    symbol: call.params.symbol,
    logo: call.params.logo,
  };
}

/** Turn a viem error into one line a person can act on. */
export function describeLaunchError(e: unknown): string {
  const err = e as { name?: string; shortMessage?: string; message?: string; cause?: { name?: string; data?: { errorName?: string } } };
  const revert = err?.cause?.data?.errorName ?? (err as { data?: { errorName?: string } })?.data?.errorName;
  if (revert === "LaunchEconomicsMismatch") return "Pons changed its launch economics while you were editing. Reload the numbers and try again.";
  if (revert === "ExemptionListTooLong") return "Too many snipe-tax exemptions for the factory.";
  if (revert === "PairTokenNotApproved") return "This pair token is not approved by Pons.";
  if (revert === "NotApprovedLauncher") return "This wallet is not allowed to launch on Pons.";
  if (revert === "ZeroAmount") return "The dev buy must be above zero when going through the forwarder.";
  const text = `${err?.shortMessage ?? ""} ${err?.message ?? ""}`;
  if (/User rejected|user rejected|denied/i.test(text)) return "You declined the transaction in the wallet. Nothing was sent.";
  if (/insufficient funds/i.test(text)) return "Not enough ETH in the wallet for the fee, the dev buy and gas.";
  if (/chain/i.test(text) && /mismatch|switch/i.test(text)) return "The wallet is on another network. Switch to Robinhood Chain.";
  return (err?.shortMessage ?? err?.message ?? "The launch failed before it was sent.").split("\n")[0].slice(0, 200);
}
