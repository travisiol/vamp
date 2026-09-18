"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BatLoader } from "@/components/brand/BatLoader";
import { BatMark } from "@/components/brand/BatMark";
import { signals } from "@/lib/flight";
import { useWebglBat } from "@/lib/hooks";
import { normalizeAddress } from "@/lib/pons";
import { useVampIt } from "@/lib/useVampIt";
import { actions, useVamp } from "@/lib/vampStore";

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const input = useVamp((s) => s.input);
  const error = useVamp((s) => s.error);
  const { vamp, loading } = useVampIt();
  const webgl = useWebglBat();
  const [hover, setHover] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const valid = Boolean(normalizeAddress(input));

  useEffect(() => {
    signals.hover = hover;
    return () => {
      signals.hover = false;
    };
  }, [hover]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loading) void vamp(input);
  };

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center px-5 pt-24 pb-16 text-center sm:px-8">
      {/* Where the chrome bat hovers. The WebGL scene reads this box every frame. */}
      <div id="bat-anchor" className="relative mx-auto -mb-[3vh] aspect-[2/1] w-[min(58vw,640px)] sm:-mb-[4vh] sm:w-[min(44vw,620px)]" aria-hidden>
        {!webgl ? (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <BatMark fluid className="h-full w-full drop-shadow-[0_18px_40px_rgba(211,19,42,0.25)]" wings={hover ? 1 : 0.9} />
          </motion.div>
        ) : null}
      </div>

      <motion.h1
        className="display relative z-[2] text-[clamp(5.5rem,17vw,15.5rem)] leading-[0.82] tracking-[-0.02em]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease }}
      >
        <span className="chrome-text drop-shadow-[0_30px_60px_rgba(0,0,0,0.9)]">VAMP</span>
      </motion.h1>

      <motion.p className="display-italic mt-5 text-[clamp(1.4rem,2.6vw,2.1rem)] text-bone" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.15, ease }}>
        Vamp any token on Robinhood.
      </motion.p>

      <motion.p className="label mt-4 leading-[1.9]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9, delay: 0.3 }}>
        Paste a contract. <span className="text-bone-3">·</span> Take what you need. <span className="text-bone-3">·</span> Launch it again.
      </motion.p>

      <motion.form onSubmit={onSubmit} className="relative z-[2] mt-10 w-full max-w-2xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.4, ease }}>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Token contract address</span>
            <input
              ref={inputRef}
              className="input mono h-14 pr-4 pl-11 text-sm sm:text-base"
              placeholder="0x… Paste token contract address"
              value={input}
              onChange={(e) => actions.setInput(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              inputMode="text"
              aria-invalid={Boolean(error) || undefined}
              aria-describedby={error ? "ca-error" : undefined}
            />
            <span className={`pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 transition-colors ${valid ? "text-blood-3" : "text-bone-3"}`}>
              <BatMark size={8} variant="solid" wings={valid ? 1 : 0.7} />
            </span>
          </label>
          <button
            type="submit"
            className="btn btn-blood h-14 px-8 text-sm"
            disabled={loading}
            onPointerEnter={() => setHover(true)}
            onPointerLeave={() => setHover(false)}
            onFocus={() => setHover(true)}
            onBlur={() => setHover(false)}
          >
            {loading ? (
              <>
                <BatLoader size={9} className="text-bone" label="Reading the chain" /> Reading
              </>
            ) : (
              <>
                Vamp it <ArrowRight size={16} strokeWidth={2.2} />
              </>
            )}
          </button>
        </div>
        <div className="mt-4 flex min-h-5 items-center justify-center">
          {error ? (
            <p id="ca-error" className="text-sm text-blood-3" role="alert">
              {error}
            </p>
          ) : (
            <p className="label text-bone-3">Robinhood Chain · Pons</p>
          )}
        </div>
      </motion.form>
    </section>
  );
}
