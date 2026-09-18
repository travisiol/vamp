"use client";

import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useId, useRef } from "react";
import { BatMark } from "@/components/brand/BatMark";
import { BODY, WING_L, WING_R, toPoints } from "@/lib/batShape";
import { useLightweight } from "@/lib/hooks";

const STEPS = [
  { n: "01", title: "Find", body: "Paste any supported Robinhood Chain token contract." },
  { n: "02", title: "Vamp", body: "Load its public on-chain metadata and customize your new token." },
  { n: "03", title: "Release", body: "Sign the transaction and launch through Pons." },
] as const;

/**
 * FIND. VAMP. LAUNCH. Three stages on one horizontal track; scrolling pans
 * the camera across them and the bat walks the line between. Phones get
 * the three stages stacked, each animating in when it enters the view.
 */
export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const light = useLightweight();
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const x = useTransform(scrollYProgress, [0, 1], ["5vw", "-5vw"]);
  const marker = useTransform(scrollYProgress, [0.08, 0.5, 0.92], ["0%", "50%", "100%"]);

  if (light || reduced) {
    return (
      <section id="how" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <Headline />
        <div className="mt-12 flex flex-col gap-10">
          {STEPS.map((s, i) => (
            <motion.div key={s.n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-10% 0px" }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>
              <StageVisual index={i} progress={null} />
              <StageCopy step={s} />
            </motion.div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="how" ref={ref} className="relative h-[280vh]">
      <div className="sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          <Headline />
        </div>
        <div className="relative mt-10">
          {/* The line the bat walks — behind the stages; the bat itself in front. */}
          <div className="absolute top-[300px] right-[10vw] left-[10vw] h-px bg-graphite-2" />
          <motion.div style={{ x }} className="flex gap-[4vw] px-[7vw]">
            {STEPS.map((s, i) => (
              <div key={s.n} className="w-[26vw] shrink-0 pt-6">
                <StageVisual index={i} progress={scrollYProgress} />
                <StageCopy step={s} />
              </div>
            ))}
          </motion.div>
          <div className="pointer-events-none absolute top-[300px] right-[10vw] left-[10vw] h-0">
            <motion.div className="absolute -translate-x-1/2 -translate-y-1/2 drop-shadow-[0_6px_14px_rgba(0,0,0,0.9)]" style={{ left: marker }}>
              <BatMark size={14} />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Headline() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <h2 className="display text-[clamp(2.8rem,7vw,6rem)]">
        <span className="chrome-text">Find.</span> <span className="blood-text">Vamp.</span> <span className="chrome-text">Launch.</span>
      </h2>
      <p className="label max-w-xs md:text-right">Three steps. No docs needed.</p>
    </div>
  );
}

function StageCopy({ step }: { step: (typeof STEPS)[number] }) {
  return (
    <div className="mt-10">
      <p className="label text-blood-3">{step.n}</p>
      <h3 className="display mt-1 text-3xl">{step.title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-bone-2">{step.body}</p>
    </div>
  );
}

/** Progress windows per stage: [start, full]. */
const WINDOWS: Array<[number, number]> = [
  [0, 0.28],
  [0.3, 0.62],
  [0.64, 0.96],
];

function useStage(progress: MotionValue<number> | null, i: number) {
  const [a, b] = WINDOWS[i];
  const fallback = useTransform(() => 1);
  const live = useTransform(progress ?? fallback, [a, b], [0, 1]);
  return progress ? live : fallback;
}

function StageVisual({ index, progress }: { index: number; progress: MotionValue<number> | null }) {
  const k = useStage(progress, index);
  const opacity = useTransform(k, [0, 0.3], [0.35, 1]);
  const scale = useTransform(k, [0, 1], [0.96, 1]);
  const fill = useTransform(k, [0.5, 1], [0, 1]);
  const reveal = useTransform(k, [0, 1], [0.22, 1]);
  const typed = useTransform(k, (v) => "0x3A7B4c19e2ae0f51ffa1b00d9c8e3B7a1e6519FA".slice(0, Math.round(v * 42)));

  return (
    <motion.div style={{ opacity, scale }} className="panel-flat relative h-[260px] overflow-hidden p-5">
      {index === 0 ? (
        <div className="flex h-full flex-col justify-between">
          <div className="input mono flex h-11 items-center text-xs text-bone-2">
            <span className="mr-2 text-blood-3">
              <BatMark size={7} variant="solid" />
            </span>
            <motion.span>{typed}</motion.span>
            <span className="ml-0.5 inline-block h-3.5 w-px animate-pulse bg-blood-3" />
          </div>
          <motion.div style={{ opacity: reveal }} className="flex items-center gap-4 rounded-2xl border border-graphite-2 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[linear-gradient(160deg,#2a2b2e,#0c0c0d)] font-[var(--font-display)] text-lg text-chrome">S</div>
            <div>
              <p className="text-sm font-semibold">Source token</p>
              <p className="mono text-xs text-bone-2">$SRC · on Robinhood Chain</p>
            </div>
          </motion.div>
        </div>
      ) : index === 1 ? (
        <VampSchematic k={k} />
      ) : (
        <div className="flex h-full flex-col justify-between">
          <motion.div style={{ opacity: reveal }} className="vamp-card flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[linear-gradient(160deg,#3a0a10,#0c0c0d)] font-[var(--font-display)] text-lg text-blood-3">V</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">New token</p>
              <p className="mono text-xs text-bone-2">$NEW · vamped from 0x3A7B…19FA</p>
            </div>
            <span className="badge">Vamped</span>
          </motion.div>
          <div className="flex items-center justify-between">
            <span className="btn btn-blood btn-sm pointer-events-none">Release the vamp</span>
            <motion.span style={{ opacity: fill }} className="label text-blood-3">
              ● Live on Pons
            </motion.span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

/** Where the five streams leave the source card and enter the new one (SVG units). */
const ROWS = [58, 78, 98, 118, 138];
const STREAM_LABELS = ["NAME", "TICKER", "IMAGE", "LINKS", "DESC"];

/**
 * Stage 02 as a schematic: source card → five labelled streams → the bat →
 * five lines → the new card. Each stream has its own row; nothing overlaps
 * the bat. Scroll progress draws the left half first, then the right.
 */
function VampSchematic({ k }: { k: MotionValue<number> }) {
  const id = useId();
  const drawLeft = useTransform(k, [0.1, 0.55], [1, 0]);
  const drawRight = useTransform(k, [0.5, 0.92], [1, 0]);
  const labels = useTransform(k, [0.12, 0.35], [0, 1]);
  const fill = useTransform(k, [0.6, 1], [0, 1]);
  const batX = 190;
  const batY = 98;
  return (
    <svg viewBox="0 0 380 190" className="h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
      <defs>
        <linearGradient id={`${id}-chrome`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.4" stopColor="#c9ccd1" />
          <stop offset="0.52" stopColor="#6f737b" />
          <stop offset="0.64" stopColor="#e8e9ec" />
          <stop offset="1" stopColor="#8b8f97" />
        </linearGradient>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0" stopColor="#d3132a" stopOpacity="0.22" />
          <stop offset="1" stopColor="#d3132a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Source card */}
      <rect x="4" y="36" width="92" height="124" rx="16" fill="#0a0a0a" stroke="#1e1e1e" />
      <rect x="20" y="52" width="32" height="32" rx="9" fill="#232326" />
      <rect x="20" y="96" width="56" height="7" rx="3.5" fill="#2f2f31" />
      <rect x="20" y="110" width="38" height="7" rx="3.5" fill="#232326" />
      <rect x="20" y="126" width="48" height="5" rx="2.5" fill="#1b1b1c" />
      <rect x="20" y="136" width="32" height="5" rx="2.5" fill="#1b1b1c" />

      {/* Streams: card → bat, one row each, labelled at the source */}
      {ROWS.map((y, i) => (
        <g key={y}>
          <motion.path d={`M 96 ${y} Q 146 ${y} ${batX - 20} ${batY}`} fill="none" stroke="#d3132a" strokeWidth={1.1} pathLength={1} strokeDasharray="1 1" style={{ strokeDashoffset: drawLeft, opacity: 0.85 }} />
          <motion.circle cx={96} cy={y} r={2} fill="#ff3b4e" style={{ opacity: labels }} />
          <motion.text x={103} y={y - 4.5} fontSize="8" letterSpacing="1.2" fill="#a5a59f" fontFamily="var(--font-jetbrains), ui-monospace, monospace" style={{ opacity: labels }}>
            {STREAM_LABELS[i]}
          </motion.text>
        </g>
      ))}

      {/* The bat, on a dark disc so the lines end at it */}
      <circle cx={batX} cy={batY} r={46} fill={`url(#${id}-halo)`} />
      <circle cx={batX} cy={batY} r={30} fill="#070707" stroke="rgba(211,19,42,0.28)" />
      <g transform={`translate(${batX - 38} ${batY - 17}) scale(0.38)`}>
        <polygon fill={`url(#${id}-chrome)`} points={toPoints(WING_L)} />
        <polygon fill={`url(#${id}-chrome)`} points={toPoints(WING_R)} />
        <polygon fill={`url(#${id}-chrome)`} points={toPoints(BODY)} />
      </g>

      {/* Bat → new card */}
      {ROWS.map((y) => (
        <motion.path key={y} d={`M ${batX + 20} ${batY} Q 240 ${y} 284 ${y}`} fill="none" stroke="#ff3b4e" strokeWidth={1.1} pathLength={1} strokeDasharray="1 1" style={{ strokeDashoffset: drawRight, opacity: 0.9 }} />
      ))}

      {/* New card */}
      <rect x="284" y="36" width="92" height="124" rx="16" fill="#0a0a0a" stroke="#1e1e1e" />
      <motion.g style={{ opacity: fill }}>
        <rect x="284" y="36" width="92" height="124" rx="16" fill="none" stroke="rgba(211,19,42,0.6)" />
        <rect x="300" y="52" width="32" height="32" rx="9" fill="#3a0a10" stroke="#8b0000" />
        <rect x="300" y="96" width="56" height="7" rx="3.5" fill="#d3132a" />
        <rect x="300" y="110" width="38" height="7" rx="3.5" fill="#8b0000" />
        <rect x="300" y="126" width="48" height="5" rx="2.5" fill="#4a0008" />
        <rect x="300" y="136" width="32" height="5" rx="2.5" fill="#4a0008" />
        <rect x="334" y="44" width="36" height="12" rx="6" fill="rgba(139,0,0,0.25)" stroke="rgba(211,19,42,0.5)" />
        <text x="352" y="52.6" fontSize="5.4" letterSpacing="1.1" textAnchor="middle" fill="#ff6b78" fontFamily="var(--font-jetbrains), ui-monospace, monospace">
          VAMPED
        </text>
      </motion.g>
    </svg>
  );
}
