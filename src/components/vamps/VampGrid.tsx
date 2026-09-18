"use client";

import { motion } from "framer-motion";
import { BatLoader } from "@/components/brand/BatLoader";
import { useNow } from "@/lib/useNow";
import { useEthPrice } from "@/lib/usePrices";
import { useRecentVamps, type VampFeed } from "@/lib/useVamps";
import { VampCard } from "./VampCard";

/** One line that says exactly what the cards are. */
export function FeedBanner({ feed }: { feed: VampFeed }) {
  const hours = feed.scanned ? Math.max(1, Math.round((feed.scanned.toBlock - feed.scanned.fromBlock) / 36_000)) : null;
  const launches = feed.scanned?.launches.toLocaleString("en-US") ?? "—";
  if (feed.mode === "vamps") return null;
  return (
    <p className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed border-graphite-3 px-4 py-3 text-xs text-bone-2">
      {feed.mode === "recent" ? (
        <>
          <span className="badge">Fresh blood</span>
          Nobody has been vamped yet ({launches} launches in the last {hours} h, none with a provenance tag). These are the latest launches on Pons — real tokens, read from the chain. Pick one. Vamp it.
        </>
      ) : (
        <>
          <span className="badge badge-chrome">Sample</span>
          {feed.error ? `Could not read the chain (${feed.error}). These cards are placeholders.` : "Nothing readable on the chain right now. These cards are placeholders."}
        </>
      )}
    </p>
  );
}

/** The grid of recent vamps — or of the latest real launches to vamp, or labeled placeholders. */
export function VampGrid({ limit = 8, columns = "sm:grid-cols-2 lg:grid-cols-4" }: { limit?: number; columns?: string }) {
  const feed = useRecentVamps(limit);
  const price = useEthPrice();
  const now = useNow();

  if (feed.isPending) {
    return (
      <div className="flex items-center gap-3 py-16 text-bone-2">
        <BatLoader size={12} className="text-blood-3" /> <span className="label">Reading the chain</span>
      </div>
    );
  }
  const data = feed.data!;
  return (
    <div>
      <FeedBanner feed={data} />
      <ul className={`grid grid-cols-1 gap-4 ${columns}`}>
        {data.cards.map((c, i) => (
          <motion.li key={c.token} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-5% 0px" }} transition={{ duration: 0.6, delay: (i % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}>
            <VampCard card={c} price={price.data} now={now} mode={data.mode} />
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
