"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { BatMark } from "@/components/brand/BatMark";
import { INTRO, signals } from "@/lib/flight";
import { useWebglBat } from "@/lib/hooks";
import { actions, getState, useVamp } from "@/lib/vampStore";

const SESSION_KEY = "vamp:intro";

/**
 * Black. A faint metallic pulse. Two red points. They go. The bat comes at
 * the camera, wings opening, and the app is behind it. 3.4 s, skippable,
 * once per session; never for reduced motion or a deep link.
 */
export function Intro() {
  const stage = useVamp((s) => s.stage);
  const webgl = useWebglBat();
  const [phase, setPhase] = useState<"hold" | "playing" | "leaving" | "done">("hold");
  const [quick, setQuick] = useState(false);
  const timers = useRef<number[]>([]);

  // Runs once: the timers must survive the stage flipping to "hero" mid-way.
  useEffect(() => {
    if (getState().stage !== "intro") {
      const id = window.setTimeout(() => {
        setQuick(true);
        setPhase("done");
      }, 0);
      return () => window.clearTimeout(id);
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      /* private mode */
    }
    const params = new URLSearchParams(window.location.search);
    const deep = params.has("ca") || params.get("intro") === "0";
    if (reduced || seen || deep) {
      const id = window.setTimeout(() => {
        setQuick(true);
        actions.finishIntro();
        setPhase("done");
      }, 0);
      return () => window.clearTimeout(id);
    }
    signals.introStartedAt = performance.now();
    try {
      sessionStorage.setItem(SESSION_KEY, "1"); // once per session, even if the tab reloads mid-way
    } catch {
      /* ignore */
    }
    const t0 = window.setTimeout(() => setPhase("playing"), 0);
    const t1 = window.setTimeout(() => {
      setPhase("leaving");
      actions.finishIntro();
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
    }, INTRO.flightEnd);
    const t2 = window.setTimeout(() => setPhase("done"), INTRO.end);
    timers.current = [t0, t1, t2];
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, []);

  const skip = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    signals.introStartedAt = 0;
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    actions.finishIntro();
    setPhase("done");
  };

  const visible = stage === "intro" || phase === "leaving";

  return (
    <AnimatePresence>
      {visible && phase !== "done" ? (
        <motion.div
          key="intro"
          className="fixed inset-0 z-[88] flex items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: quick ? 0.12 : 0.6, ease: "easeInOut" } }}
          aria-label="Intro"
        >
          {phase === "playing" ? (
            <>
              {/* The pulse: three chrome rings, like a struck bell heard in the dark. */}
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="absolute h-40 w-40 rounded-full border"
                  style={{ borderColor: "rgba(214,216,220,0.35)" }}
                  initial={{ scale: 0.2, opacity: 0 }}
                  animate={{ scale: [0.2, 3.2], opacity: [0, 0.35, 0] }}
                  transition={{ duration: 1.1, delay: 0.12 + i * 0.16, ease: "easeOut" }}
                />
              ))}
              {/* Two red points. */}
              {[-1, 1].map((d) => (
                <motion.span
                  key={d}
                  className="absolute h-[3px] w-[3px] rounded-full bg-blood-3"
                  style={{ marginLeft: d * 18, boxShadow: "0 0 10px 2px rgba(255,59,78,0.7)" }}
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1, 1, 0.2] }}
                  transition={{ duration: 0.72, delay: 0.82, times: [0, 0.25, 0.8, 1], ease: "easeInOut" }}
                />
              ))}
              {!webgl ? (
                <motion.div
                  className="absolute"
                  initial={{ scale: 0.02, opacity: 0, y: 40 }}
                  animate={{ scale: [0.02, 0.35, 14], opacity: [0, 1, 1], y: [40, 10, -120] }}
                  transition={{ duration: (INTRO.flightEnd - INTRO.flightStart) / 1000, delay: INTRO.flightStart / 1000, ease: [0.55, 0, 1, 0.45], times: [0, 0.55, 1] }}
                >
                  <BatMark size={60} wings={1} />
                </motion.div>
              ) : null}
            </>
          ) : null}
          <button
            type="button"
            onClick={skip}
            className="label absolute right-6 bottom-6 rounded-md px-3 py-2 text-bone-3 transition hover:text-bone focus-visible:text-bone"
          >
            Skip
          </button>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
