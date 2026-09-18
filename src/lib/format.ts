import { formatEther } from "viem";

export const shortAddress = (a: string | null | undefined, head = 6, tail = 4) => (a ? `${a.slice(0, head)}…${a.slice(-tail)}` : "—");

/** "0x3A7B…19FA" as the brief writes it: 4 hex after 0x, 4 at the end. */
export const vampAddress = (a: string | null | undefined) => (a ? `${a.slice(0, 6)}…${a.slice(-4).toUpperCase()}` : "—");

export function formatEth(wei: bigint | null | undefined, digits = 4): string {
  if (wei === null || wei === undefined) return "—";
  const n = Number(formatEther(wei));
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function formatUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 10_000) return `$${Math.round(value).toLocaleString("en-US")}`;
  if (value >= 100) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

export function formatCompact(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function timeAgo(ms: number | null | undefined, now = Date.now()): string {
  if (!ms) return "—";
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export const pct = (bps: number | bigint) => `${(Number(bps) / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;

/** Socials typed by people come in every shape; turn them into something that opens. */
export function socialHref(kind: "twitter" | "telegram" | "discord" | "website" | "farcaster", value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (kind === "twitter") return `https://x.com/${v.replace(/^@/, "")}`;
  if (kind === "telegram") return `https://t.me/${v.replace(/^@/, "")}`;
  if (kind === "farcaster") return v.startsWith("vamp:") ? null : `https://warpcast.com/${v.replace(/^@/, "")}`;
  if (kind === "discord") return v.includes(".") ? `https://${v}` : `https://discord.gg/${v}`;
  return `https://${v}`;
}
