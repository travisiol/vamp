"use client";

import { FeedHeadline } from "@/components/home/Sections";
import { useRecentVamps } from "@/lib/useVamps";
import { VampGrid } from "./VampGrid";

export function LaunchedPage() {
  const feed = useRecentVamps(48);
  const mode = feed.data?.mode;
  return (
    <main className="mx-auto max-w-7xl px-5 pt-32 pb-16 sm:px-8">
      <p className="label text-blood-3">Launched</p>
      <div className="mt-3">
        <FeedHeadline mode={mode} size="text-[clamp(2.8rem,7vw,6.5rem)]" />
      </div>
      <p className="lead mt-5 max-w-xl">
        {mode === "recent"
          ? "The latest launches on Pons, read from the factory on Robinhood Chain. Nobody has vamped them yet — every card opens the editor."
          : "Every launch that carries a provenance tag, newest first. Read from the Pons factory on Robinhood Chain."}
      </p>
      <div className="mt-12">
        <VampGrid limit={48} columns="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
      </div>
    </main>
  );
}
