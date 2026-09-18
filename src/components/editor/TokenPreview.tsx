"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";
import { formatEther } from "viem";
import { BatSilhouette } from "@/components/brand/BatMark";
import { BatLoader } from "@/components/brand/BatLoader";
import { Num } from "@/components/ui/Num";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { vampAddress } from "@/lib/format";
import { useEconomics } from "@/lib/useEconomics";
import { useVamp } from "@/lib/vampStore";

/**
 * The new token as a floating card. Tilts up to 4° toward the pointer with
 * a highlight that moves like light on lacquer. Numbers under it come from
 * the factory, live.
 */
export function TokenPreview() {
  const draft = useVamp((s) => s.draft);
  const source = useVamp((s) => s.source);
  const eco = useEconomics();
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [4, -4]), { stiffness: 180, damping: 22 });
  const ry = useSpring(useTransform(mx, [0, 1], [-4, 4]), { stiffness: 180, damping: 22 });
  const hx = useTransform(mx, (v) => `${v * 100}%`);
  const hy = useTransform(my, (v) => `${v * 100}%`);
  const sheen = useTransform(mx, [0, 1], ["-30%", "130%"]);
  const highlight = useTransform([hx, hy], ([x, y]) => `radial-gradient(420px circle at ${x} ${y}, rgba(255,255,255,0.09), transparent 45%)`);

  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  if (!draft) return null;
  const devBuy = draft.devBuyEth.trim() ? draft.devBuyEth.trim() : "0";
  const fee = eco.data ? Number(formatEther(eco.data.launchFee)) : null;
  const grad = eco.data ? Number(formatEther(eco.data.graduationThreshold)) : null;

  return (
    <div className="w-full">
      <div style={{ perspective: 1200 }}>
        <motion.div
          ref={ref}
          onPointerMove={onMove}
          onPointerLeave={onLeave}
          style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
          className="relative mx-auto w-full max-w-[380px] overflow-hidden rounded-[1.5rem] border border-graphite-3 bg-[linear-gradient(160deg,#141416_0%,#070708_55%,#0b0710_100%)] p-7 shadow-[0_40px_90px_-30px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.02)_inset]"
        >
          {/* Light on the lacquer. */}
          <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: highlight }} />
          <motion.div aria-hidden className="pointer-events-none absolute inset-y-0 w-1/3 skew-x-[-18deg] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)]" style={{ left: sheen }} />
          <BatSilhouette className="pointer-events-none absolute -right-10 -bottom-6 w-56 text-white/[0.035]" />

          <div className="relative flex items-start justify-between">
            <TokenLogo logo={draft.logo} name={draft.name || draft.symbol} size={76} rounded="rounded-2xl" />
            <span className="badge">Vamped</span>
          </div>
          <p className="relative mt-6 truncate text-[1.6rem] leading-tight font-semibold tracking-wide">{draft.name.trim() || <span className="text-bone-3">Name</span>}</p>
          <p className="mono relative mt-1 text-base text-bone-2">${draft.symbol.trim() || "TICKER"}</p>
          {draft.description.trim() ? <p className="relative mt-4 line-clamp-3 text-[13px] leading-relaxed text-bone-2">{draft.description.trim()}</p> : null}

          <div className="relative mt-6 border-t border-graphite-2 pt-4">
            <p className="label text-[10px] text-blood-3">Vamped from</p>
            <p className="mono mt-1 text-sm text-bone">{source ? vampAddress(source.address) : "—"}</p>
            {source?.name ? (
              <p className="mt-0.5 truncate text-xs text-bone-3">
                {source.name} · ${source.symbol}
              </p>
            ) : null}
          </div>
        </motion.div>
      </div>

      <dl className="mx-auto mt-6 grid max-w-[380px] grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <Stat label="Pair" value="ETH" />
        <Stat label="Dev buy" value={<Num value={Number(devBuy) || 0} format={(n) => `${n.toLocaleString("en-US", { maximumFractionDigits: 4 })} ETH`} />} />
        <Stat label="Creator tax" value={<Num value={draft.creatorTaxPct} format={(n) => `${n.toFixed(2).replace(/\.?0+$/, "")}%`} />} />
        <Stat label="Launch fee" value={fee === null ? <BatLoader size={7} className="text-bone-3" /> : <Num value={fee} format={(n) => `${n.toLocaleString("en-US", { maximumFractionDigits: 5 })} ETH`} />} live />
        <Stat label="Graduation" value={grad === null ? <BatLoader size={7} className="text-bone-3" /> : <Num value={grad} format={(n) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ETH`} />} live />
        <Stat label="Supply" value={eco.data ? <Num value={Number(formatEther(eco.data.supply))} format={(n) => `${(n / 1e9).toFixed(n >= 1e9 ? 0 : 2)}B`} /> : <BatLoader size={7} className="text-bone-3" />} live />
      </dl>
      {eco.isError ? <p className="mx-auto mt-3 max-w-[380px] text-xs text-blood-3">Could not read the factory right now — the live numbers will fill in when it answers.</p> : null}
    </div>
  );
}

function Stat({ label, value, live }: { label: string; value: React.ReactNode; live?: boolean }) {
  return (
    <div>
      <dt className="label flex items-center gap-1.5 text-[10px]">
        {label}
        {live ? <span className="h-1 w-1 rounded-full bg-blood-3 shadow-[0_0_6px_rgba(255,59,78,0.9)]" title="Read live from the Pons factory" /> : null}
      </dt>
      <dd className="mono mt-1 text-sm text-bone">{value}</dd>
    </div>
  );
}
