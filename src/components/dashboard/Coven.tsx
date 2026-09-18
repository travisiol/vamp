"use client";

import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useConnection, usePublicClient, useWriteContract } from "wagmi";
import { BatLoader } from "@/components/brand/BatLoader";
import { BatMark } from "@/components/brand/BatMark";
import { Num } from "@/components/ui/Num";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { CHAIN_ID, PONS } from "@/config/contracts";
import { formatEth, formatUsd, timeAgo, vampAddress } from "@/lib/format";
import { useMounted } from "@/lib/hooks";
import type { LaunchCard } from "@/lib/launches";
import { readMyLaunches } from "@/lib/myLaunches";
import { describeLaunchError, feeEscrowAbi } from "@/lib/pons";
import { ethToUsd } from "@/lib/prices";
import { explorer, pons } from "@/lib/robinhood";
import { sampleCoven, sampleVamps } from "@/lib/sample";
import { toast } from "@/lib/toast";
import { useNow } from "@/lib/useNow";
import { useEthPrice } from "@/lib/usePrices";
import { useWalletLaunches } from "@/lib/useVamps";

/** YOUR COVEN: totals in large type, then every launch, sparse black surfaces. */
export function Coven() {
  const mounted = useMounted();
  const { address, isConnected } = useConnection();
  const [mine] = useState(() => (typeof window === "undefined" ? [] : readMyLaunches()));
  const launches = useWalletLaunches(isConnected ? address : undefined, mine.map((m) => m.token));
  const price = useEthPrice();
  const now = useNow();
  const client = usePublicClient();
  const { mutateAsync: write } = useWriteContract();
  const [claiming, setClaiming] = useState(false);

  const connected = mounted && isConnected && address;
  const data = launches.data;
  const cards: LaunchCard[] = connected ? (data?.launches ?? []) : sampleVamps().slice(0, 4);
  const claimable = connected ? BigInt(data?.claimableWei ?? "0") : 0n;
  const volumeWei = cards.reduce((s, c) => s + BigInt(c.stats?.volumeWei ?? "0"), 0n);
  const volumeUsd = ethToUsd(volumeWei, price.data);
  const active = cards.filter((c) => c.stats && !c.stats.graduated).length;

  const claim = async () => {
    if (!client || !address) return;
    setClaiming(true);
    try {
      const hash = await write({ address: PONS.feeEscrow, abi: feeEscrowAbi, functionName: "claim", chainId: CHAIN_ID });
      toast({ kind: "info", title: "Claim sent", href: explorer.tx(hash), hrefLabel: "View transaction" });
      const receipt = await client.waitForTransactionReceipt({ hash });
      if (receipt.status === "success") {
        toast({ kind: "success", title: "Fees claimed", body: `${formatEth(claimable)} ETH to ${vampAddress(address)}`, href: explorer.tx(hash), hrefLabel: "View transaction" });
        void launches.refetch();
      } else toast({ kind: "error", title: "Claim reverted", href: explorer.tx(hash), hrefLabel: "View transaction" });
    } catch (e) {
      toast({ kind: "error", title: "Claim failed", body: describeLaunchError(e) });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-5 pt-32 pb-16 sm:px-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label text-blood-3">Dashboard</p>
          <h1 className="display mt-3 text-[clamp(2.8rem,7vw,6.5rem)]">
            <span className="chrome-text">Your</span> <span className="blood-text">coven.</span>
          </h1>
        </div>
        {!connected ? (
          <div className="flex items-center gap-4">
            <span className="badge badge-chrome">Sample</span>
            <ConnectButton size="md" />
          </div>
        ) : (
          <p className="label">
            {vampAddress(address)} · {launches.isFetching ? "refreshing" : data ? `read ${timeAgo(data.at, now)}` : "reading"}
          </p>
        )}
      </div>

      {!connected ? <p className="mt-6 max-w-xl text-sm text-bone-2">This is a sample coven. Connect the wallet that launched your vamps to see the real one — read from the Pons factory, escrow and curves.</p> : null}

      <dl className="mt-14 grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-4">
        <Big label="Total vamps" value={<Num value={connected ? cards.length : sampleCoven.totalVamps} format={(n) => Math.round(n).toString()} />} />
        <Big label="Claimable fees" value={<Num value={connected ? Number(claimable) / 1e18 : sampleCoven.claimableEth} format={(n) => `${n.toLocaleString("en-US", { maximumFractionDigits: 4 })} ETH`} />} accent />
        <Big
          label="Total volume"
          value={connected ? volumeUsd !== null ? <Num value={volumeUsd} format={formatUsd} /> : <Num value={Number(volumeWei) / 1e18} format={(n) => `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ETH`} /> : <Num value={sampleCoven.totalVolumeUsd} format={formatUsd} />}
        />
        <Big label="Active curves" value={<Num value={connected ? active : sampleCoven.activeCurves} format={(n) => Math.round(n).toString()} />} />
      </dl>

      {connected ? (
        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-graphite-2 pt-6">
          <button type="button" className="btn btn-blood" disabled={claimable === 0n || claiming} onClick={claim}>
            {claiming ? <BatLoader size={9} className="text-bone" /> : null} Claim fees
          </button>
          <p className="max-w-lg text-xs leading-relaxed text-bone-3">
            {claimable > 0n ? `${formatEth(claimable)} ETH waits in the Pons fee escrow for this wallet.` : "Nothing to claim in the escrow yet. Creator fees accrue on each curve and are swept to the escrow by Pons; what is still on the curves shows as accruing below."}
          </p>
        </div>
      ) : null}

      <section className="mt-16" aria-label="Launches">
        {connected && launches.isPending ? (
          <div className="flex items-center gap-3 py-12 text-bone-2">
            <BatLoader size={12} className="text-blood-3" /> <span className="label">Reading your launches</span>
          </div>
        ) : connected && launches.isError ? (
          <p className="text-sm text-blood-3">Could not read the chain: {launches.error.message}</p>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-start gap-4 rounded-3xl border border-dashed border-graphite-3 p-8">
            <BatMark size={16} />
            <p className="text-sm text-bone-2">No launch by this wallet yet.</p>
            <Link href="/" className="btn btn-blood btn-sm">
              Vamp a token
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col">
            {cards.map((c) => (
              <LaunchRow key={c.token} card={c} sample={!connected} price={price.data ?? null} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Big({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className={`display mt-3 text-[clamp(2rem,4.2vw,3.6rem)] ${accent ? "blood-text" : ""}`}>{value}</dd>
    </div>
  );
}

function LaunchRow({ card, sample, price }: { card: LaunchCard; sample: boolean; price: ReturnType<typeof useEthPrice>["data"] | null }) {
  const s = card.stats;
  const money = (wei: string | undefined) => {
    if (!wei) return "—";
    const u = ethToUsd(BigInt(wei), price);
    return u !== null ? formatUsd(u) : `${formatEth(BigInt(wei), 3)} ETH`;
  };
  return (
    <li className="grid gap-5 border-t border-graphite-2 py-7 md:grid-cols-[minmax(0,2fr)_repeat(5,minmax(0,1fr))_auto] md:items-center">
      <div className="flex items-center gap-4">
        <TokenLogo logo={card.logo} name={card.name || card.symbol} size={52} />
        <div className="min-w-0">
          <p className="display truncate text-2xl">{card.name || "Unnamed"}</p>
          <p className="mono text-sm text-bone-2">${card.symbol || "—"}</p>
          <p className={`label mt-1 text-[9px] ${s?.graduated ? "text-chrome" : "text-blood-3"}`}>Status: {s?.graduated ? "Graduated" : "Live"}</p>
        </div>
      </div>
      <Cell label="Volume" value={money(s?.volumeWei)} />
      <Cell label="Market cap" value={money(s?.marketCapWei)} />
      <Cell label="Fees generated" value={s ? `${formatEth(BigInt(s.creatorFeesWei) + BigInt(s.accruingWei), 4)} ETH` : "—"} />
      <Cell label="Accruing" value={s ? `${formatEth(BigInt(s.accruingWei), 4)} ETH` : "—"} hint="Still on the curve" />
      <Cell label="Source token" value={card.source ? vampAddress(card.source) : "—"} mono />
      <div className="flex gap-2 md:justify-end">
        {sample ? (
          <span className="btn btn-ghost btn-sm pointer-events-none opacity-60">View</span>
        ) : (
          <a href={pons.token(card.token)} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
            View <ExternalLink size={12} />
          </a>
        )}
      </div>
    </li>
  );
}

function Cell({ label, value, mono, hint }: { label: string; value: string; mono?: boolean; hint?: string }) {
  return (
    <div>
      <p className="label text-[9px]" title={hint}>
        {label}
      </p>
      <p className={`mt-1 text-sm ${mono ? "mono" : "tnum"}`}>{value}</p>
    </div>
  );
}
