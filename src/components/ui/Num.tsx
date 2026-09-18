"use client";

import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

type Props = {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
};

/** A number that rolls to its new value instead of jumping. */
export function Num({ value, format = (n) => n.toLocaleString("en-US", { maximumFractionDigits: 2 }), className = "", duration = 0.9 }: Props) {
  const reduced = useReducedMotion();
  const mv = useMotionValue(value);
  const [text, setText] = useState(() => format(value));

  useEffect(() => {
    if (reduced) {
      mv.set(value);
      const id = window.setTimeout(() => setText(format(value)), 0);
      return () => window.clearTimeout(id);
    }
    const controls = animate(mv, value, { duration, ease: [0.16, 1, 0.3, 1] });
    const unsub = mv.on("change", (v) => setText(format(v)));
    return () => {
      controls.stop();
      unsub();
    };
    // `format` is a fresh closure on every render; only the value drives the roll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced]);

  return <span className={`tnum ${className}`}>{text}</span>;
}
