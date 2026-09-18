"use client";

import { useEffect, useState } from "react";
import { imageCandidates } from "@/lib/ipfs";

type Props = {
  logo: string | null | undefined;
  name: string;
  size?: number;
  className?: string;
  rounded?: string;
};

/**
 * A token image with gateway fallbacks. No image → the first letters in a
 * dark chrome disc, never a broken icon.
 */
export function TokenLogo({ logo, name, size = 48, className = "", rounded = "rounded-2xl" }: Props) {
  const candidates = imageCandidates(logo);
  const [idx, setIdx] = useState(0);
  const key = candidates[0] ?? "";
  useEffect(() => {
    const id = window.setTimeout(() => setIdx(0), 0);
    return () => window.clearTimeout(id);
  }, [key]);
  const src = candidates[idx];
  const initials = (name || "?")
    .replace(/[^A-Za-z0-9]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  if (!src) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center ${rounded} border border-graphite-3 bg-[linear-gradient(160deg,#2a2b2e,#0c0c0d)] text-chrome ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(11, size * 0.32), fontFamily: "var(--font-display)", fontWeight: 600 }}
        aria-label={name}
        role="img"
      >
        {initials}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      draggable={false}
      onError={() => setIdx((i) => i + 1)}
      className={`shrink-0 ${rounded} border border-graphite-3 bg-graphite object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
