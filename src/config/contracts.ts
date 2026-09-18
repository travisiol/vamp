import type { Address, Hex } from "viem";

/**
 * Everything VAMP needs to know about the chain, in one place.
 *
 * Values marked VERIFIED were read from Robinhood Chain (chain id 4663) on
 * 2026-09-18 through the public RPC: factory.launchForwarder(),
 * factory.feeEscrow(), factory.launchFee(), getLaunchConfig(0).
 *
 * Values marked CONFIGURE are optional integrations that stay off until an
 * environment variable is set — the UI says so wherever they matter.
 */

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 4663);

/** Official RPC. It answers eth_getLogs over wide ranges, publicnode does not. */
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.mainnet.chain.robinhood.com";

/** Read-only fallbacks, tried after RPC_URL. */
export const RPC_FALLBACKS: string[] = (process.env.NEXT_PUBLIC_RPC_FALLBACKS ?? "https://robinhood-rpc.publicnode.com")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const EXPLORER_URL = (process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://robinhoodchain.blockscout.com").replace(/\/$/, "");

/** Pons front-end, for "View on Pons" links. */
export const PONS_APP_URL = (process.env.NEXT_PUBLIC_PONS_APP_URL ?? "https://www.ponsfamily.com").replace(/\/$/, "");

export const PONS = {
  /** VERIFIED — PonsV2 factory. `launchToken(params, configId, pairToken, exemptions)` payable. */
  factory: (process.env.NEXT_PUBLIC_PONS_FACTORY ?? "0x7eD598BcEf8bd9Edd8C97A195C6d13f40801EC7e") as Address,
  /** VERIFIED — `factory.launchForwarder()`: create + first buy in one transaction. */
  launchForwarder: (process.env.NEXT_PUBLIC_PONS_FORWARDER ?? "0xe33E9E479dF8802cb0866d5d05258bEc4cF62948") as Address,
  /** VERIFIED — `factory.feeEscrow()`: where swept creator fees wait to be claimed. */
  feeEscrow: (process.env.NEXT_PUBLIC_PONS_ESCROW ?? "0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e") as Address,
  /** VERIFIED — the only launch config on the factory today (1e9 supply, 1% fee, 1.68 ETH phantom, 4.2 ETH graduation). */
  launchConfigId: BigInt(process.env.NEXT_PUBLIC_PONS_CONFIG_ID ?? "0"),
  /** Native ETH pair is address(0) on the factory. Other pair tokens must be approved by Pons. */
  pairToken: "0x0000000000000000000000000000000000000000" as Address,
  /** VERIFIED — MAX_SNIPE_TAX_EXEMPTIONS on the factory; the forwarder adds the buyer itself. */
  maxExemptions: 32,
} as const;

/** VERIFIED — Multicall3 at its canonical address. */
export const MULTICALL3 = "0xcA11bde05977b3631167028862bE2a173976CA11" as Address;

/** VERIFIED — Pyth on Robinhood Chain (proxy). Only BTC and ETH are pushed regularly. */
export const PYTH = {
  address: "0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a" as Address,
  ethUsdFeed: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace" as Hex,
} as const;

/** keccak256("TokenLaunched(address,address,address,address,uint256,uint256)") — VERIFIED against live logs. */
export const TOKEN_LAUNCHED_TOPIC = "0x8d4aad4953d0ca700d468f3753aa14432d1b35b43ec6409f051fb6aa43a89607" as Hex;

/**
 * CONFIGURE — WalletConnect Cloud project id. Without it only injected
 * (browser) wallets are offered. https://cloud.walletconnect.com
 */
export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?.trim() || "";

/**
 * CONFIGURE (server only) — Pinata JWT for image uploads to IPFS. Without it
 * the editor accepts an https:// or ipfs:// image URL instead of a file.
 */
export const hasImageUploads = () => Boolean(process.env.PINATA_JWT?.trim());

/** How far back the recent-vamps scan looks (blocks are ~0.1 s apart: 300k ≈ 8 h). Kept under serverless time limits. */
export const RECENT_SCAN_BLOCKS = BigInt(process.env.VAMP_SCAN_BLOCKS ?? "300000");

/** How far back a wallet's launches are looked up (topic-filtered, cheap): 30M ≈ 35 days. */
export const DASHBOARD_SCAN_BLOCKS = BigInt(process.env.VAMP_DASHBOARD_BLOCKS ?? "30000000");
