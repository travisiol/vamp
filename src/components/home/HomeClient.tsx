"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { Editor } from "@/components/editor/Editor";
import { LiveScreen } from "@/components/launch/LiveScreen";
import { ReleaseFlow } from "@/components/launch/ReleaseFlow";
import { signals } from "@/lib/flight";
import { normalizeAddress } from "@/lib/pons";
import { useRelease } from "@/lib/useRelease";
import { useVampIt } from "@/lib/useVampIt";
import { actions, useVamp } from "@/lib/vampStore";
import { Extraction } from "./Extraction";
import { Hero } from "./Hero";
import { Intro } from "./Intro";

const BatScene = dynamic(() => import("@/components/three/BatScene"), { ssr: false });

/**
 * The product, top of the page: intro → hero → extraction → editor →
 * release → live. One store drives every stage; the chrome bat is the
 * same object through all of them.
 */
export function HomeClient() {
  const stage = useVamp((s) => s.stage);
  const { vamp } = useVampIt();
  const { state: release, release: doRelease, reset: resetRelease } = useRelease();

  // Deep link: /?ca=0x… goes straight to the extraction.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const address = normalizeAddress(params.get("ca"));
    if (!address) return;
    const t = params.get("t");
    signals.freezeAt = t !== null && Number.isFinite(Number(t)) ? Number(t) : null;
    actions.vampAddress(address);
    void vamp(address);
  }, [vamp]);

  useEffect(() => {
    if (stage === "extracting" || stage === "editor" || stage === "live") window.scrollTo({ top: 0, behavior: "auto" });
  }, [stage]);

  return (
    <>
      <BatScene />
      <Intro />
      <div className="relative z-[2] min-h-[100svh]">
        <AnimatePresence mode="wait">
          {stage === "intro" || stage === "hero" ? (
            <motion.div key="hero" exit={{ opacity: 0, y: -16, transition: { duration: 0.35 } }}>
              <Hero />
            </motion.div>
          ) : stage === "extracting" ? (
            <motion.div key="extract" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.4 } }}>
              <Extraction />
            </motion.div>
          ) : stage === "live" ? (
            <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
              <LiveScreen />
            </motion.div>
          ) : (
            <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.3 } }}>
              <Editor onRelease={doRelease} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ReleaseFlow state={release} onClose={resetRelease} />
    </>
  );
}
