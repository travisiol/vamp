"use client";

import type { Address, Hex } from "viem";
import type { LaunchResult } from "./pons";

/**
 * Launches made from this browser, remembered locally so the dashboard can
 * show them even when the creator wallet differs from the signer (the
 * TokenLaunched.deployer index would miss those).
 */
export type MyLaunch = {
  token: Address;
  curve: Address;
  hash: Hex;
  deployer: Address;
  source: Address | null;
  name: string;
  symbol: string;
  logo: string;
  launchedAt: number;
};

const KEY = "vamp:launches";

export function readMyLaunches(): MyLaunch[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as MyLaunch[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function rememberLaunch(r: LaunchResult): void {
  try {
    const list = readMyLaunches().filter((l) => l.token.toLowerCase() !== r.token.toLowerCase());
    list.unshift({ token: r.token, curve: r.curve, hash: r.hash, deployer: r.deployer, source: r.source, name: r.name, symbol: r.symbol, logo: r.logo, launchedAt: r.launchedAt });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 100)));
  } catch {
    /* storage is a nicety */
  }
}
