"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useState } from "react";
import { formatEther } from "viem";
import { useBalance, useConnection } from "wagmi";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { Field, Slider, TextArea, TextInput, Toggle } from "@/components/ui/fields";
import { CHAIN_ID } from "@/config/contracts";
import { formatEth, vampAddress } from "@/lib/format";
import { normalizeAddress, parseEthAmount } from "@/lib/pons";
import { useEconomics } from "@/lib/useEconomics";
import { actions, useVamp } from "@/lib/vampStore";
import { ImageField } from "./ImageField";
import { ReleaseButton } from "./ReleaseButton";
import { TokenPreview } from "./TokenPreview";
import { VampMeter } from "./VampMeter";

const ease = [0.16, 1, 0.3, 1] as const;

/** Two columns: what you can change on the left, what you get on the right. */
export function Editor({ onRelease }: { onRelease: () => void }) {
  const draft = useVamp((s) => s.draft);
  const source = useVamp((s) => s.source);
  const stage = useVamp((s) => s.stage);
  const { address, isConnected, chainId } = useConnection();
  const balance = useBalance({ address, chainId: CHAIN_ID, query: { enabled: Boolean(address) } });
  const eco = useEconomics();
  const uploads = useQuery({ queryKey: ["uploads"], queryFn: async () => ((await (await fetch("/api/upload")).json()) as { enabled: boolean }).enabled, staleTime: Infinity });
  const [advanced, setAdvanced] = useState(false);

  if (!draft || !source) return null;

  const maxTax = eco.data ? eco.data.maxCreatorTaxBps / 100 : 10;
  const devBuyWei = parseEthAmount(draft.devBuyEth);
  const devBuyError = devBuyWei === null ? "Not a number." : null;
  const creatorWalletError = draft.creatorWallet.trim() && !normalizeAddress(draft.creatorWallet) ? "Not an address." : null;
  const nameError = !draft.name.trim() ? "Required." : draft.name.trim().length > 64 ? "64 characters maximum." : null;
  const symbolError = !draft.symbol.trim() ? "Required." : draft.symbol.trim().length > 16 ? "16 characters maximum." : null;
  const invalid = Boolean(devBuyError || creatorWalletError || nameError || symbolError);
  const needed = eco.data && devBuyWei !== null ? eco.data.launchFee + devBuyWei : null;
  const short = needed !== null && balance.data ? balance.data.value < needed : false;

  const reason = !isConnected ? "Connect a wallet to release." : chainId !== CHAIN_ID ? "Switch the wallet to Robinhood Chain." : invalid ? "Fix the fields marked in red." : short ? `The wallet needs ${formatEth(needed)} ETH plus gas.` : stage === "releasing" ? "Releasing…" : null;

  return (
    <motion.section className="relative mx-auto w-full max-w-7xl px-5 pt-24 pb-16 sm:px-8" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease }} aria-label="Token editor">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <button type="button" className="label flex items-center gap-2 text-bone-2 transition hover:text-bone" onClick={() => actions.reset()}>
          <ArrowLeft size={14} /> Another token
        </button>
        <p className="label">
          Vamped from <span className="mono text-bone">{vampAddress(source.address)}</span>
          {source.kind === "erc20" ? <span className="ml-2 text-bone-3">· plain ERC-20, no image or links on chain</span> : null}
        </p>
      </div>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
        {/* LEFT: parameters */}
        <div className="flex flex-col gap-10">
          <fieldset className="flex flex-col gap-5">
            <legend className="display mb-4 text-2xl tracking-wide">Token identity</legend>
            <div className="grid gap-5 sm:grid-cols-[1fr_180px]">
              <Field label="Name" error={nameError}>
                <TextInput value={draft.name} onChange={(e) => actions.updateDraft({ name: e.target.value })} maxLength={64} aria-invalid={Boolean(nameError)} />
              </Field>
              <Field label="Ticker" error={symbolError}>
                <TextInput className="mono uppercase" value={draft.symbol} onChange={(e) => actions.updateDraft({ symbol: e.target.value.toUpperCase().replace(/\s+/g, "") })} maxLength={16} aria-invalid={Boolean(symbolError)} />
              </Field>
            </div>
            <Field label="Description" right={`${draft.description.length}/500`}>
              <TextArea value={draft.description} onChange={(e) => actions.updateDraft({ description: e.target.value.slice(0, 500) })} placeholder="What this token is. Short." />
            </Field>
            <ImageField value={draft.logo} name={draft.name || draft.symbol} onChange={(logo) => actions.updateDraft({ logo })} uploads={uploads.data ?? null} />
          </fieldset>

          <fieldset className="flex flex-col gap-5">
            <legend className="display mb-4 text-2xl tracking-wide">Socials</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="X">
                <TextInput value={draft.socials.twitter} onChange={(e) => actions.updateDraft({ socials: { ...draft.socials, twitter: e.target.value } })} placeholder="https://x.com/…" />
              </Field>
              <Field label="Telegram">
                <TextInput value={draft.socials.telegram} onChange={(e) => actions.updateDraft({ socials: { ...draft.socials, telegram: e.target.value } })} placeholder="https://t.me/…" />
              </Field>
              <Field label="Website">
                <TextInput value={draft.socials.website} onChange={(e) => actions.updateDraft({ socials: { ...draft.socials, website: e.target.value } })} placeholder="https://…" />
              </Field>
              <Field label="Discord">
                <TextInput value={draft.socials.discord} onChange={(e) => actions.updateDraft({ socials: { ...draft.socials, discord: e.target.value } })} placeholder="https://discord.gg/…" />
              </Field>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-5">
            <legend className="display mb-4 text-2xl tracking-wide">Launch settings</legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Paired asset" hint={eco.data ? `Graduates once the curve raises ${formatEth(eco.data.graduationThreshold, 2)} ETH.` : "Read from the factory."}>
                <div className="input flex items-center gap-2 text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-chrome text-[10px] font-bold text-void">Ξ</span> ETH
                </div>
              </Field>
              <Field
                label="Developer buy"
                error={devBuyError}
                hint={balance.data ? `Wallet: ${formatEth(balance.data.value)} ETH` : "Bought in the same transaction, before anyone else."}
                right={eco.data ? `fee ${formatEth(eco.data.launchFee, 5)} ETH` : undefined}
              >
                <div className="relative">
                  <TextInput className="mono pr-14" value={draft.devBuyEth} onChange={(e) => actions.updateDraft({ devBuyEth: e.target.value.replace(/[^\d.,]/g, "") })} placeholder="0.00" inputMode="decimal" aria-invalid={Boolean(devBuyError)} />
                  <span className="label pointer-events-none absolute top-1/2 right-4 -translate-y-1/2">ETH</span>
                </div>
              </Field>
            </div>
            <Field label="Creator wallet" error={creatorWalletError} hint="Receives the creator tax. Empty = the connected wallet.">
              <TextInput className="mono" value={draft.creatorWallet} onChange={(e) => actions.updateDraft({ creatorWallet: e.target.value })} placeholder={address ?? "0x…"} spellCheck={false} />
            </Field>
            <Field label="Creator tax" hint={`0 to ${maxTax}% of every trade on the curve, to the creator wallet.`}>
              <Slider value={draft.creatorTaxPct} min={0} max={maxTax} step={0.25} onChange={(v) => actions.updateDraft({ creatorTaxPct: v })} format={(v) => `${v.toFixed(2).replace(/\.?0+$/, "")}%`} />
            </Field>

            <button type="button" className="label flex items-center gap-2 self-start text-bone-2 transition hover:text-bone" onClick={() => setAdvanced((v) => !v)} aria-expanded={advanced}>
              Advanced settings <ChevronDown size={14} className={`transition-transform ${advanced ? "rotate-180" : ""}`} />
            </button>
            {advanced ? (
              <motion.div className="flex flex-col gap-5" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
                <Toggle checked={draft.tagProvenance} onChange={(v) => actions.updateDraft({ tagProvenance: v })} label="Record the source on chain" hint={`Writes vamp:${source.address.slice(0, 10)}… into the token's spare social slot, so the lineage is verifiable and the token shows up in the Vamp network.`} />
                <Toggle checked={draft.buybackEnabled} onChange={(v) => actions.updateDraft({ buybackEnabled: v })} label="Buyback" hint="Lets the curve route part of its fees into buying the token back. Off for most launches." />
                <Field label="Snipe-tax exemptions" hint={eco.data ? `Wallets exempt from the ${eco.data.snipeTaxStartBps / 100}% snipe tax during the first ${eco.data.snipeTaxSeconds}s. One address per line; you are exempt already.` : "One address per line."}>
                  <TextArea className="mono text-xs" value={draft.snipeExemptions.join("\n")} onChange={(e) => actions.updateDraft({ snipeExemptions: e.target.value.split(/\n/) })} placeholder="0x…" spellCheck={false} />
                </Field>
              </motion.div>
            ) : null}
          </fieldset>
        </div>

        {/* RIGHT: preview */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="flex flex-col items-center gap-8">
            <TokenPreview />
            <div className="w-full max-w-[380px] border-t border-graphite-2 pt-6">
              <p className="label mb-4">Vamp meter</p>
              <VampMeter compact />
            </div>
            <div className="w-full">
              {!isConnected ? (
                <div className="flex flex-col items-center gap-3">
                  <ConnectButton size="md" />
                  <p className="text-xs text-bone-3">Connect to release.</p>
                </div>
              ) : (
                <ReleaseButton onClick={onRelease} disabled={Boolean(reason)} reason={reason} />
              )}
            </div>
            {eco.data && devBuyWei !== null ? (
              <p className="mono text-center text-[11px] text-bone-3">
                Sends {formatEth(eco.data.launchFee + devBuyWei, 5)} ETH · {formatEther(eco.data.launchFee)} fee{devBuyWei > 0n ? ` + ${formatEth(devBuyWei)} dev buy` : ""} · plus gas
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
