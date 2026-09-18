"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { BatLoader } from "@/components/brand/BatLoader";
import { LineageGraph } from "@/components/network/LineageGraph";
import { VampGrid } from "@/components/vamps/VampGrid";
import { useRecentVamps } from "@/lib/useVamps";

/** "They've been vamped." — or, while nobody has: "Fresh blood." over the latest real launches. */
export function FeedHeadline({ mode, size = "text-[clamp(2.6rem,6vw,5.5rem)]" }: { mode: "vamps" | "recent" | "sample" | undefined; size?: string }) {
  if (mode === "recent") {
    return (
      <h2 className={`display ${size}`}>
        <span className="chrome-text">Fresh</span> <span className="blood-text">blood.</span>
      </h2>
    );
  }
  return (
    <h2 className={`display ${size}`}>
      <span className="chrome-text">They&apos;ve been</span> <span className="blood-text">vamped.</span>
    </h2>
  );
}

export function RecentVampsSection() {
  const feed = useRecentVamps(8);
  const mode = feed.data?.mode;
  return (
    <section id="launched" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <FeedHeadline mode={mode} />
          {mode === "recent" ? <p className="label mt-4">The latest launches on Pons. Nobody has vamped them. Yet.</p> : null}
        </div>
        <Link href="/launched" className="label flex items-center gap-2 text-bone-2 transition hover:text-bone">
          All launches <ArrowRight size={14} />
        </Link>
      </div>
      <VampGrid limit={8} />
    </section>
  );
}

export function NetworkSection() {
  const feed = useRecentVamps(40);
  const mode = feed.data?.mode;
  return (
    <section id="network" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
      <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="display text-[clamp(2.6rem,6vw,5.5rem)]">
            <span className="chrome-text">Vamp</span> <span className="blood-text">network.</span>
          </h2>
          <p className="label mt-4">{mode === "recent" ? "No lineage yet. The first vamp draws the first line." : "Source token → vamp → new token. The lineage, on chain."}</p>
        </div>
        <Link href="/network" className="label flex items-center gap-2 text-bone-2 transition hover:text-bone">
          Full map <ArrowRight size={14} />
        </Link>
      </div>
      {feed.data ? (
        <LineageGraph cards={feed.data.cards} mode={feed.data.mode} height={480} />
      ) : (
        <div className="flex h-[480px] items-center justify-center rounded-3xl border border-graphite-2">
          <BatLoader size={12} className="text-blood-3" />
        </div>
      )}
    </section>
  );
}
