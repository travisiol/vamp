"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { BODY, WING_HINGE, WING_L, WING_R, toPoints } from "@/lib/batShape";
import { extractionPose, flight, isStacked, signals, STREAMS, streamOrigin, streamProgress, T, type ExtractionLayout } from "@/lib/flight";
import { vampAddress } from "@/lib/format";
import { useWebglBat } from "@/lib/hooks";
import { actions, useVamp, type MeterKey } from "@/lib/vampStore";
import { TokenLogo } from "@/components/ui/TokenLogo";

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * The signature animation. The source token on the left, the bat flies to
 * it, five red streams (name, ticker, image, description, links) are pulled
 * out, the bat carries them right, a dark card materializes and fills.
 * VAMPED. Then the editor.
 */
export function Extraction() {
  const source = useVamp((s) => s.source);
  const webgl = useWebglBat();
  const sourceRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const batRef = useRef<HTMLDivElement>(null);
  const wingLRef = useRef<SVGGElement>(null);
  const wingRRef = useRef<SVGGElement>(null);
  const [fill, setFill] = useState(false);
  const [stamp, setStamp] = useState(false);

  useEffect(() => {
    if (!source) return;
    const start = performance.now();
    signals.extractStartedAt = start;
    const marked = new Set<MeterKey>();
    let raf = 0;
    let done = false;

    const measure = (): ExtractionLayout | null => {
      const a = sourceRef.current?.getBoundingClientRect();
      const b = targetRef.current?.getBoundingClientRect();
      if (!a || !b || a.width === 0) return null;
      const home = flight.visible && flight.x ? { x: flight.x, y: flight.y } : { x: window.innerWidth / 2, y: window.innerHeight * 0.3 };
      return {
        home: signals.layout?.home ?? home,
        source: { x: a.left + a.width / 2, y: a.top + a.height / 2, w: a.width, h: a.height },
        target: { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height },
      };
    };

    const tick = () => {
      if (done) return;
      const L = measure();
      signals.layout = L;
      const t = signals.freezeAt ?? performance.now() - start;
      if (L) {
        const pose = extractionPose(t, L);
        if (!webgl) {
          flight.x = pose.x;
          flight.y = pose.y;
          flight.wings = pose.wings;
          flight.scale = pose.scale;
          flight.visible = true;
          const el = batRef.current;
          if (el) {
            const size = Math.min(170, window.innerWidth * 0.3) * pose.scale;
            el.style.transform = `translate(${pose.x - size}px, ${pose.y - size / 2}px) rotate(${(pose.roll * 180) / Math.PI}deg)`;
            el.style.width = `${size * 2}px`;
            el.style.height = `${size}px`;
            el.style.opacity = "1";
            const f = 0.12 + 0.88 * pose.wings;
            if (wingLRef.current) wingLRef.current.style.transform = `scaleX(${f})`;
            if (wingRRef.current) wingRRef.current.style.transform = `scaleX(${f})`;
          }
        }
        // Streams: from the card to the bat's mouth.
        const svg = svgRef.current;
        if (svg) {
          const bx = flight.x - (isStacked(L) ? 0 : 26 * flight.scale);
          const by = flight.y + (isStacked(L) ? -10 : 6);
          const active = t >= T.arrive - 80 && t <= T.depart + 120;
          const fadeIn = Math.min(1, Math.max(0, (t - (T.arrive - 80)) / 220));
          const fadeOut = Math.min(1, Math.max(0, (T.depart + 120 - t) / 200));
          const alpha = active ? Math.min(fadeIn, fadeOut) : 0;
          STREAMS.forEach((s, i) => {
            const o = streamOrigin(L, i);
            const path = svg.querySelector<SVGPathElement>(`#stream-${i}`);
            const dot = svg.querySelector<SVGCircleElement>(`#dot-${i}`);
            const label = svg.querySelector<SVGTextElement>(`#label-${i}`);
            if (!path || !dot || !label) return;
            const cx = (o.x + bx) / 2 + (i - 2) * 6;
            const cy = (o.y + by) / 2 - 14 + Math.abs(i - 2) * 8;
            path.setAttribute("d", `M ${o.x} ${o.y} Q ${cx} ${cy} ${bx} ${by}`);
            path.style.opacity = String(alpha * 0.55);
            const p = streamProgress(t, i);
            if (p >= 0 && p <= 1) {
              const u = 1 - p;
              const x = u * u * o.x + 2 * u * p * cx + p * p * bx;
              const y = u * u * o.y + 2 * u * p * cy + p * p * by;
              dot.setAttribute("cx", String(x));
              dot.setAttribute("cy", String(y));
              dot.style.opacity = "1";
              label.setAttribute("x", String(x));
              label.setAttribute("y", String(y - 10));
              label.style.opacity = String(1 - p * 0.6);
            } else {
              dot.style.opacity = "0";
              label.style.opacity = "0";
            }
            if (p === 2 && !marked.has(s.key)) {
              marked.add(s.key);
              actions.markExtracted(s.key);
            }
          });
        }
      }
      if (t >= T.fill) setFill(true);
      if (t >= T.stamp) setStamp(true);
      if (t >= T.end + 350 && signals.freezeAt === null) {
        done = true;
        actions.enterEditor();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // A background tab gets no animation frames; the editor must still arrive.
    const fallback = window.setTimeout(() => {
      if (done || signals.freezeAt !== null) return;
      done = true;
      actions.enterEditor();
    }, T.end + 900);
    return () => {
      done = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(fallback);
      signals.extractStartedAt = 0;
      signals.layout = null;
    };
  }, [source, webgl]);

  if (!source) return null;
  const from = vampAddress(source.address);

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center px-5 pt-24 pb-16 sm:px-8" aria-live="polite" aria-label="Extracting token metadata">
      <div className="relative grid w-full max-w-5xl grid-cols-1 items-center gap-44 sm:grid-cols-[1fr_minmax(160px,1fr)_1fr] sm:gap-6">
        {/* Source */}
        <motion.div initial={{ opacity: 0, x: -24, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ duration: 0.6, ease }} className="justify-self-center sm:justify-self-end">
          <p className="label mb-3 text-center">Source</p>
          <div ref={sourceRef} className={`panel-flat w-[min(78vw,260px)] p-6 text-center transition-opacity duration-700 ${fill ? "opacity-55" : "opacity-100"}`}>
            <div className="flex justify-center">
              <TokenLogo logo={source.logo} name={source.name || source.symbol} size={88} />
            </div>
            <p className="mt-5 truncate text-lg font-semibold tracking-wide">{source.name || "Unnamed"}</p>
            <p className="mono mt-1 text-sm text-bone-2">${source.symbol || "—"}</p>
            <p className="mono mt-4 text-[11px] text-bone-3">{from}</p>
          </div>
        </motion.div>

        <div className="hidden sm:block" />

        {/* Target */}
        <div className="justify-self-center sm:justify-self-start">
          <p className={`label mb-3 text-center transition-opacity duration-700 ${fill ? "opacity-100" : "opacity-0"}`}>New token</p>
          <div ref={targetRef} className="relative w-[min(78vw,260px)]">
            <motion.div
              className="vamp-card p-6 text-center"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: fill ? 1 : 0.25, scale: fill ? 1 : 0.94, borderColor: fill ? "rgba(211,19,42,0.6)" : "rgba(30,30,30,1)" }}
              transition={{ duration: 0.7, ease }}
            >
              <div className="flex justify-center">
                <motion.div initial={{ opacity: 0, scale: 0.7 }} animate={fill ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.5, delay: 0.05, ease }}>
                  <TokenLogo logo={source.logo} name={source.name || source.symbol} size={88} />
                </motion.div>
              </div>
              <motion.p className="mt-5 truncate text-lg font-semibold tracking-wide" initial={{ opacity: 0, y: 8 }} animate={fill ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.15, ease }}>
                {source.name || "Unnamed"}
              </motion.p>
              <motion.p className="mono mt-1 text-sm text-bone-2" initial={{ opacity: 0, y: 8 }} animate={fill ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.25, ease }}>
                ${source.symbol || "—"}
              </motion.p>
              <motion.div className="mt-4 border-t border-graphite-2 pt-3" initial={{ opacity: 0 }} animate={fill ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.4 }}>
                <p className="label text-[9px] text-blood-3">Vamped from</p>
                <p className="mono mt-1 text-[11px] text-bone-2">{from}</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* VAMPED. */}
      <motion.p
        className="display pointer-events-none absolute bottom-[12vh] left-1/2 -translate-x-1/2 text-[clamp(2.4rem,7vw,5.5rem)] blood-text"
        initial={{ opacity: 0, scale: 1.15, filter: "blur(6px)" }}
        animate={stamp ? { opacity: 1, scale: 1, filter: "blur(0px)" } : {}}
        transition={{ duration: 0.45, ease }}
        aria-hidden={!stamp}
      >
        Vamped.
      </motion.p>

      {/* Streams, in viewport space. */}
      <svg ref={svgRef} className="pointer-events-none fixed inset-0 z-[3] h-full w-full" aria-hidden>
        <defs>
          <filter id="stream-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>
        {STREAMS.map((s, i) => (
          <g key={s.key}>
            <path id={`stream-${i}`} d="M 0 0" fill="none" stroke="#d3132a" strokeWidth={1} style={{ opacity: 0 }} />
            <circle id={`dot-${i}`} r={3} fill="#ff3b4e" filter="url(#stream-glow)" style={{ opacity: 0 }} />
            <text id={`label-${i}`} fill="#f1f1ed" fontSize={10} letterSpacing="0.18em" textAnchor="middle" className="mono" style={{ opacity: 0 }}>
              {s.label}
            </text>
          </g>
        ))}
      </svg>

      {/* The SVG bat, when WebGL sits this one out. */}
      {!webgl ? (
        <div ref={batRef} className="pointer-events-none fixed top-0 left-0 z-[4] opacity-0" aria-hidden>
          <svg viewBox="0 0 200 100" className="h-full w-full drop-shadow-[0_10px_30px_rgba(211,19,42,0.3)]">
            <defs>
              <linearGradient id="xbat" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="0.4" stopColor="#c9ccd1" />
                <stop offset="0.52" stopColor="#6f737b" />
                <stop offset="0.64" stopColor="#e8e9ec" />
                <stop offset="1" stopColor="#8b8f97" />
              </linearGradient>
            </defs>
            <g ref={wingLRef} style={{ transformOrigin: `${200 - WING_HINGE[0]}px ${WING_HINGE[1]}px`, transformBox: "view-box" }}>
              <polygon fill="url(#xbat)" points={toPoints(WING_L)} />
            </g>
            <g ref={wingRRef} style={{ transformOrigin: `${WING_HINGE[0]}px ${WING_HINGE[1]}px`, transformBox: "view-box" }}>
              <polygon fill="url(#xbat)" points={toPoints(WING_R)} />
            </g>
            <polygon fill="url(#xbat)" points={toPoints(BODY)} />
          </svg>
        </div>
      ) : null}
    </section>
  );
}
