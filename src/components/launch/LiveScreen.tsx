"use client";

import { motion } from "framer-motion";
import { Copy, ExternalLink } from "lucide-react";
import { BatMark } from "@/components/brand/BatMark";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { formatEth, shortAddress } from "@/lib/format";
import { explorer, pons } from "@/lib/robinhood";
import { toast } from "@/lib/toast";
import { actions, useVamp } from "@/lib/vampStore";

const ease = [0.16, 1, 0.3, 1] as const;

/** YOUR VAMP IS LIVE. Everything the launch produced, with links that go to the chain. */
export function LiveScreen() {
  const result = useVamp((s) => s.result);
  if (!result) return null;
  const copy = () => navigator.clipboard.writeText(result.token).then(() => toast({ kind: "success", title: "Contract address copied", body: result.token }));
  const rows: Array<{ label: string; value: string; href?: string; full?: string }> = [
    { label: "Token", value: `${result.name} · $${result.symbol}` },
    { label: "Contract address", value: shortAddress(result.token, 8, 6), href: explorer.token(result.token), full: result.token },
    { label: "Curve", value: shortAddress(result.curve, 8, 6), href: explorer.address(result.curve), full: result.curve },
    { label: "Transaction", value: shortAddress(result.hash, 10, 8), href: explorer.tx(result.hash), full: result.hash },
    { label: "Dev buy", value: result.devBuy > 0n ? `${formatEth(result.devBuy)} ETH${result.tokensOut ? ` → ${formatEth(result.tokensOut, 0)} $${result.symbol}` : ""}` : "None" },
    { label: "Source contract", value: result.source ? shortAddress(result.source, 8, 6) : "—", href: result.source ? explorer.token(result.source) : undefined, full: result.source ?? undefined },
  ];
  return (
    <motion.section className="mx-auto w-full max-w-4xl px-5 pt-28 pb-16 sm:px-8" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }} aria-label="Your vamp is live">
      <div className="flex flex-col items-center text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.9, ease, delay: 0.1 }}>
          <BatMark size={34} wings={1} />
        </motion.div>
        <h2 className="display mt-6 text-[clamp(2.6rem,7vw,5.5rem)]">
          <span className="chrome-text">Your vamp</span> <span className="blood-text">is live.</span>
        </h2>
        <p className="label mt-4">
          Vamped from <span className="mono text-bone">{result.source ? shortAddress(result.source) : "—"}</span> · Robinhood Chain · Pons
        </p>
      </div>

      <div className="panel mt-12 grid gap-8 p-7 sm:grid-cols-[auto_1fr] sm:p-9">
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <TokenLogo logo={result.logo} name={result.name} size={96} />
          <span className="badge">Vamped</span>
        </div>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {rows.map((r) => (
            <div key={r.label} className="min-w-0">
              <dt className="label text-[10px]">{r.label}</dt>
              <dd className="mono mt-1 truncate text-sm">
                {r.href ? (
                  <a href={r.href} target="_blank" rel="noreferrer" title={r.full} className="inline-flex items-center gap-1 hover:text-blood-3">
                    {r.value} <ExternalLink size={12} className="text-bone-3" />
                  </a>
                ) : (
                  r.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <a href={pons.token(result.token)} target="_blank" rel="noreferrer" className="btn btn-blood">
          View on Pons <ExternalLink size={14} />
        </a>
        <a href={explorer.tx(result.hash)} target="_blank" rel="noreferrer" className="btn btn-ghost">
          View transaction <ExternalLink size={14} />
        </a>
        <button type="button" className="btn btn-chrome" onClick={copy}>
          Copy CA <Copy size={14} />
        </button>
      </div>
      <div className="mt-10 text-center">
        <button type="button" className="label text-bone-2 transition hover:text-bone" onClick={() => actions.reset()}>
          Vamp another token →
        </button>
      </div>
    </motion.section>
  );
}
