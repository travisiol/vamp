"use client";

import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import type { PointerEvent } from "react";
import { BatSilhouette } from "@/components/brand/BatMark";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { formatEth, formatUsd, timeAgo, vampAddress } from "@/lib/format";
import type { LaunchCard } from "@/lib/launches";
import { ethToUsd, type EthPrice } from "@/lib/prices";
import { pons } from "@/lib/robinhood";
import type { FeedMode } from "@/lib/useVamps";

/**
 * One token card. In "vamps" mode it is a vamped token (badge, source,
 * link to Pons). In "recent" mode it is a real launch nobody has vamped yet —
 * the whole card is the invitation to vamp it. Hover: the image darkens, a
 * translucent chrome bat appears behind it, the border pulses red.
 */
export function VampCard({ card, price, now, mode = "vamps" }: { card: LaunchCard; price?: EthPrice | null; now: number; mode?: FeedMode }) {
  const s = card.stats;
  const mc = s ? BigInt(s.marketCapWei) : null;
  const vol = s ? BigInt(s.volumeWei) : null;
  const fees = s ? BigInt(s.creatorFeesWei) + BigInt(s.accruingWei) : null;
  const usd = (wei: bigint | null) => (wei === null ? null : ethToUsd(wei, price));
  const money = (wei: bigint | null) => {
    if (wei === null) return "—";
    const u = usd(wei);
    return u !== null ? formatUsd(u) : `${formatEth(wei, 3)} ETH`;
  };
  // 2–4° of tilt toward the pointer, through two CSS variables — no re-render per move.
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--tx", `${((e.clientX - r.left) / r.width - 0.5) * 6}deg`);
    e.currentTarget.style.setProperty("--ty", `${(0.5 - (e.clientY - r.top) / r.height) * 6}deg`);
  };
  const onLeave = (e: PointerEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty("--tx", "0deg");
    e.currentTarget.style.setProperty("--ty", "0deg");
  };
  const recent = mode === "recent";
  const inner = (
    <article className="vamp-card tilt h-full p-5" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <BatSilhouette className="silhouette absolute -right-6 -bottom-4 w-44 text-chrome/[0.09]" />
      </div>
      <div className="relative flex items-start justify-between gap-3">
        <div className="darken">
          <TokenLogo logo={card.logo} name={card.name || card.symbol} size={56} />
        </div>
        {recent ? <span className="badge badge-chrome">On Pons</span> : <span className="badge">Vamped</span>}
      </div>
      <p className="relative mt-4 truncate text-base font-semibold tracking-wide">{card.name || "Unnamed"}</p>
      <p className="mono relative mt-0.5 text-sm text-bone-2">${card.symbol || "—"}</p>
      <dl className="relative mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
        <dt className="label text-[9px]">{recent ? "Contract" : "Source"}</dt>
        <dd className="mono truncate text-right text-bone-2">{recent ? vampAddress(card.token) : card.source ? (card.sourceSymbol ? `$${card.sourceSymbol} · ` : "") + vampAddress(card.source) : "—"}</dd>
        <dt className="label text-[9px]">Launched</dt>
        <dd className="mono text-right text-bone-2">{timeAgo(card.launchedAt, now)}</dd>
      </dl>
      {s ? (
        <dl className="relative mt-4 grid grid-cols-3 gap-2 border-t border-graphite-2 pt-3">
          <div>
            <dt className="label text-[9px]">MC</dt>
            <dd className="mono mt-0.5 text-xs">{money(mc)}</dd>
          </div>
          <div>
            <dt className="label text-[9px]">Volume</dt>
            <dd className="mono mt-0.5 text-xs">{money(vol)}</dd>
          </div>
          <div>
            <dt className="label text-[9px]">Fees</dt>
            <dd className="mono mt-0.5 text-xs">{fees === null ? "—" : `${formatEth(fees, 4)} Ξ`}</dd>
          </div>
        </dl>
      ) : null}
      {s?.graduated ? <span className="badge badge-chrome absolute top-5 right-5 translate-y-7">Graduated</span> : null}
      {recent ? (
        <span className="relative mt-4 flex items-center gap-2 text-[11px] font-semibold tracking-[0.16em] text-blood-3 uppercase">
          Vamp it <ArrowRight size={12} />
        </span>
      ) : null}
    </article>
  );
  if (card.sample) return <div className="block h-full">{inner}</div>;
  if (recent) {
    return (
      <div className="group relative h-full">
        <Link href={`/?ca=${card.token}`} className="block h-full" aria-label={`Vamp ${card.name}`}>
          {inner}
        </Link>
        <a href={pons.token(card.token)} target="_blank" rel="noreferrer" className="badge badge-dim absolute right-4 bottom-4 bg-void/80 opacity-0 backdrop-blur transition group-hover:opacity-100 hover:border-chrome-2 hover:text-bone">
          Pons <ExternalLink size={9} />
        </a>
      </div>
    );
  }
  return (
    <div className="group relative h-full">
      <a href={pons.token(card.token)} target="_blank" rel="noreferrer" className="block h-full" aria-label={`${card.name} on Pons`}>
        {inner}
      </a>
      <div className="absolute right-4 bottom-4 flex gap-2 opacity-0 transition group-hover:opacity-100">
        {card.source ? (
          <Link href={`/?ca=${card.source}`} className="badge badge-dim bg-void/80 backdrop-blur hover:border-blood-2 hover:text-blood-3">
            Vamp the source
          </Link>
        ) : null}
        <span className="badge badge-dim bg-void/80 backdrop-blur">
          Pons <ExternalLink size={9} />
        </span>
      </div>
    </div>
  );
}
