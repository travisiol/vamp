import Link from "next/link";
import { BatMark } from "@/components/brand/BatMark";
import { PONS } from "@/config/contracts";
import { shortAddress } from "@/lib/format";
import { explorer } from "@/lib/robinhood";

export function Footer() {
  return (
    <footer className="hairline mt-24">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 py-12 sm:px-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <BatMark size={14} />
            <span className="display text-xl tracking-[0.04em]">VAMP</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-bone-2">Paste a token. Vamp it. Launch it. Every vamp is attributed to its source, on chain.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
          <Link href="/launched" className="text-bone-2 transition hover:text-bone">
            Launched
          </Link>
          <Link href="/network" className="text-bone-2 transition hover:text-bone">
            Network
          </Link>
          <Link href="/dashboard" className="text-bone-2 transition hover:text-bone">
            Dashboard
          </Link>
          <a href={explorer.address(PONS.factory)} target="_blank" rel="noreferrer" className="text-bone-2 transition hover:text-bone">
            Pons factory
          </a>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 pb-10 sm:px-8 md:flex-row md:items-center md:justify-between">
        <p className="label">Robinhood Chain · 4663 · Pons V2 · factory {shortAddress(PONS.factory)}</p>
        <p className="max-w-xl text-[11px] leading-relaxed text-bone-3">
          VAMP reads public on-chain data and submits the transactions you sign. It is not affiliated with Pons or Robinhood. A vamped token is a new token; the source stays what it was. Nothing here is financial advice.
        </p>
      </div>
    </footer>
  );
}
