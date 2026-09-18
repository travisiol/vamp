"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { METER_KEYS, useVamp, type MeterKey } from "@/lib/vampStore";

const LABELS: Record<MeterKey, string> = { name: "Name", ticker: "Ticker", image: "Image", links: "Socials", description: "Description" };
const ORDER: MeterKey[] = ["name", "ticker", "image", "links", "description"];

/**
 * The VAMP METER: one tick per piece of metadata the source gave up, a
 * vertical blood column that fills with them. Full → READY TO VAMP.
 */
export function VampMeter({ compact = false }: { compact?: boolean }) {
  const extracted = useVamp((s) => s.extracted);
  const draft = useVamp((s) => s.draft);
  // The draft can complete what the source lacked (a pasted image, a typed description).
  const has: Record<MeterKey, boolean> = {
    name: extracted.name || Boolean(draft?.name.trim()),
    ticker: extracted.ticker || Boolean(draft?.symbol.trim()),
    image: extracted.image || Boolean(draft?.logo.trim()),
    description: extracted.description || Boolean(draft?.description.trim()),
    links: extracted.links || Boolean(draft && Object.entries(draft.socials).some(([k, v]) => k !== "farcaster" && v.trim())),
  };
  const count = METER_KEYS.filter((k) => has[k]).length;
  const pct = Math.round((count / METER_KEYS.length) * 100);
  const ready = pct === 100;

  return (
    <div className={`flex ${compact ? "items-center gap-4" : "items-stretch gap-5"}`} aria-label={`Vamp meter ${pct}%`}>
      <div className="meter-track" style={{ height: compact ? 96 : 176 }}>
        <div className="meter-fill" style={{ height: `${pct}%` }} />
      </div>
      <div className="flex flex-col justify-between py-0.5">
        <ul className="flex flex-col gap-1.5">
          {ORDER.map((k) => (
            <li key={k} className="flex items-center gap-2">
              <span className={`flex h-4 w-4 items-center justify-center rounded-full border transition ${has[k] ? "border-blood-2 bg-blood text-bone" : "border-graphite-3 text-transparent"}`}>
                <Check size={10} strokeWidth={3} />
              </span>
              <span className={`label ${has[k] ? "text-bone" : "text-bone-3"}`}>{LABELS[k]}</span>
            </li>
          ))}
        </ul>
        <motion.p
          key={ready ? "ready" : "pct"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-3 text-[11px] font-semibold tracking-[0.2em] uppercase ${ready ? "text-blood-3" : "text-bone-3"}`}
        >
          {ready ? "Ready to vamp" : `${pct}% vamped`}
        </motion.p>
      </div>
    </div>
  );
}
