"use client";

import { BatLoader } from "@/components/brand/BatLoader";
import { useRecentVamps } from "@/lib/useVamps";
import { LineageGraph } from "./LineageGraph";

export function NetworkPage() {
  const feed = useRecentVamps(60);
  const mode = feed.data?.mode;
  const sources = feed.data ? new Set(feed.data.cards.map((c) => c.source?.toLowerCase()).filter(Boolean)).size : 0;
  return (
    <main className="mx-auto max-w-7xl px-5 pt-32 pb-16 sm:px-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label text-blood-3">Network</p>
          <h1 className="display mt-3 text-[clamp(2.8rem,7vw,6.5rem)]">
            <span className="chrome-text">Vamp</span> <span className="blood-text">network.</span>
          </h1>
          <p className="lead mt-5 max-w-xl">
            {mode === "recent"
              ? "No lineage yet: nobody has been vamped. These are the latest launches on Pons — hover one, then vamp it and draw the first line."
              : "White nodes are source tokens. Red nodes are their vamps. Hover a node to see the token, click a source to vamp it yourself."}
          </p>
        </div>
        {feed.data ? (
          <dl className="grid grid-cols-2 gap-8">
            <div>
              <dt className="label">{mode === "recent" ? "Launches" : "Sources"}</dt>
              <dd className="display mt-1 text-4xl">{mode === "recent" ? Math.min(20, feed.data.cards.length) : sources}</dd>
            </div>
            <div>
              <dt className="label">Vamps</dt>
              <dd className="display mt-1 text-4xl blood-text">{mode === "recent" ? 0 : feed.data.cards.length}</dd>
            </div>
          </dl>
        ) : null}
      </div>
      <div className="mt-12">
        {feed.data ? (
          <LineageGraph cards={feed.data.cards} mode={feed.data.mode} height={640} />
        ) : (
          <div className="flex h-[640px] items-center justify-center rounded-3xl border border-graphite-2">
            <BatLoader size={12} className="text-blood-3" />
          </div>
        )}
        {feed.data?.mode === "sample" ? <p className="mt-4 text-xs text-bone-3">Sample lineage — the chain could not be read. Real vamps appear here as soon as one is released.</p> : null}
      </div>
    </main>
  );
}
