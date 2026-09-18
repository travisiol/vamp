"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Lock, Unlock } from "lucide-react";
import { useEffect, useState } from "react";
import { BatLoader } from "@/components/brand/BatLoader";
import { BatMark } from "@/components/brand/BatMark";
import { shortAddress } from "@/lib/format";
import { explorer } from "@/lib/robinhood";
import type { ReleaseState } from "@/lib/useRelease";

const STEPS: Array<{ key: ReleaseState["step"]; label: string; detail: string }> = [
  { key: "preflight", label: "Preflight", detail: "Reading the factory: fee, economics, your balance." },
  { key: "simulate", label: "Simulate", detail: "Running the exact launch against the chain first." },
  { key: "sign", label: "Sign", detail: "Confirm in your wallet." },
  { key: "pending", label: "Pending", detail: "Waiting for the block." },
];

/**
 * The release, step by step, then the cage: locked, unlocked, and the bat
 * escapes upward. Errors say what happened and, if a transaction went out,
 * carry its hash — launching twice makes two tokens.
 */
export function ReleaseFlow({ state, onClose }: { state: ReleaseState; onClose: () => void }) {
  const open = state.step !== "idle" && state.step !== "live";
  const idx = STEPS.findIndex((s) => s.key === state.step);
  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Releasing the vamp">
          <motion.div className="panel relative w-full max-w-md overflow-hidden p-7" initial={{ y: 20, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10, scale: 0.98 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
            {state.step === "cage" ? (
              <Cage />
            ) : state.step === "error" ? (
              <div>
                <p className="label text-blood-3">Not released</p>
                <p className="mt-3 text-sm leading-relaxed text-bone">{state.error}</p>
                {state.hash ? (
                  <div className="mt-4 rounded-xl border border-blood/50 bg-blood/10 p-3 text-xs leading-relaxed text-bone-2">
                    A transaction was sent. Check it before trying again — a second launch would create a second token.
                    <a href={explorer.tx(state.hash)} target="_blank" rel="noreferrer" className="mono mt-2 flex items-center gap-1 text-bone hover:text-blood-3">
                      {shortAddress(state.hash, 10, 8)} <ExternalLink size={12} />
                    </a>
                  </div>
                ) : null}
                <button type="button" className="btn btn-ghost mt-6 w-full" onClick={onClose}>
                  Back to the editor
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3">
                  <BatLoader size={11} className="text-blood-3" label="Releasing" />
                  <p className="label">Releasing the vamp</p>
                </div>
                <ol className="mt-6 flex flex-col gap-3">
                  {STEPS.map((s, i) => {
                    const done = i < idx;
                    const active = i === idx;
                    return (
                      <li key={s.key} className={`flex items-start gap-3 transition-opacity ${done || active ? "opacity-100" : "opacity-35"}`}>
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${done ? "border-blood-2 bg-blood text-bone" : active ? "border-blood-3 text-blood-3" : "border-graphite-3 text-bone-3"}`}>{done ? "✓" : i + 1}</span>
                        <span>
                          <span className="block text-sm font-medium">{s.label}</span>
                          {active ? <span className="mt-0.5 block text-xs text-bone-2">{s.detail}</span> : null}
                        </span>
                      </li>
                    );
                  })}
                </ol>
                {state.predicted ? (
                  <p className="mono mt-6 text-[11px] leading-relaxed text-bone-3">
                    Token will be <span className="text-bone-2">{shortAddress(state.predicted.token)}</span> · curve <span className="text-bone-2">{shortAddress(state.predicted.curve)}</span>
                  </p>
                ) : null}
                {state.hash ? (
                  <a href={explorer.tx(state.hash)} target="_blank" rel="noreferrer" className="mono mt-3 flex items-center gap-1 text-[11px] text-bone-2 hover:text-blood-3">
                    tx {shortAddress(state.hash, 10, 8)} <ExternalLink size={11} />
                  </a>
                ) : null}
              </div>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** BAT CAGE LOCKED → unlock → the bat escapes upward. 2.4 s. */
function Cage() {
  const bars = [0, 1, 2, 3, 4, 5, 6];
  return (
    <div className="flex flex-col items-center py-2">
      <motion.p className="label" initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 1.2, times: [0, 0.7, 1] }}>
        Bat cage locked
      </motion.p>
      <div className="relative mt-5 h-52 w-52 overflow-visible">
        {/* Bars */}
        <div className="absolute inset-0 rounded-3xl border border-graphite-3" />
        {bars.map((b) => (
          <motion.span
            key={b}
            className="absolute top-3 bottom-3 w-px bg-[linear-gradient(180deg,#e8e9ec,#6f737b_50%,#c9ccd1)]"
            style={{ left: `${12 + b * 12.5}%` }}
            initial={{ scaleY: 1, opacity: 1 }}
            animate={{ scaleY: [1, 1, 0], opacity: [1, 1, 0] }}
            transition={{ duration: 1.8, times: [0, 0.6, 1], delay: 0.1 + Math.abs(b - 3) * 0.05, ease: "easeInOut" }}
          />
        ))}
        {/* Lock */}
        <motion.span className="absolute -top-3 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-graphite-3 bg-void text-bone-2" initial={{ rotate: 0 }} animate={{ rotate: [0, -8, 8, -6, 0], opacity: [1, 1, 1, 0] }} transition={{ duration: 1.3, times: [0, 0.2, 0.4, 0.6, 1] }}>
          <motion.span initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 0.9, times: [0, 0.8, 1] }} className="absolute">
            <Lock size={13} />
          </motion.span>
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1] }} transition={{ duration: 0.9, times: [0, 0.8, 1] }} className="absolute text-blood-3">
            <Unlock size={13} />
          </motion.span>
        </motion.span>
        {/* The bat */}
        <motion.div className="absolute inset-0 flex items-center justify-center" initial={{ y: 0, scale: 0.9, opacity: 1 }} animate={{ y: [0, 0, 6, -260], scale: [0.9, 0.9, 1, 1.25], opacity: [1, 1, 1, 0] }} transition={{ duration: 2.3, times: [0, 0.45, 0.6, 1], ease: [0.6, 0, 0.3, 1] }}>
          <Wings />
        </motion.div>
      </div>
      <motion.p className="display mt-4 text-xl blood-text" initial={{ opacity: 0 }} animate={{ opacity: [0, 0, 1] }} transition={{ duration: 2.2, times: [0, 0.7, 1] }}>
        Released.
      </motion.p>
    </div>
  );
}

function Wings() {
  const [wings, setWings] = useState(0.2);
  useEffect(() => {
    const id = window.setTimeout(() => setWings(1), 950);
    return () => window.clearTimeout(id);
  }, []);
  return <BatMark size={44} wings={wings} />;
}
