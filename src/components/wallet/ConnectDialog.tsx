"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useConnect, useConnectors } from "wagmi";
import { BatLoader } from "@/components/brand/BatLoader";
import { BatMark } from "@/components/brand/BatMark";
import { hasWalletConnect } from "@/lib/wagmi";

/**
 * Our own connect sheet: every injected wallet the browser announces
 * (EIP-6963) as its own row, WalletConnect when configured.
 */
export function ConnectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const connectors = useConnectors();
  const { mutateAsync: connect, isPending, variables, error, reset } = useConnect();
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Generic "injected" sits alongside the named wallets; hide it once a named one exists.
  const named = connectors.filter((c) => c.type === "injected" && c.id !== "injected");
  const list = connectors.filter((c) => !(c.id === "injected" && named.length > 0));
  const pendingId = isPending ? (variables as { connector?: { uid?: string } } | undefined)?.connector?.uid : undefined;

  const pick = async (uid: string) => {
    const c = connectors.find((x) => x.uid === uid);
    if (!c) return;
    setFailed(null);
    try {
      await connect({ connector: c });
      onClose();
    } catch (e) {
      const msg = (e as { shortMessage?: string; message?: string })?.shortMessage ?? (e as Error)?.message ?? "Connection failed.";
      setFailed(msg.split("\n")[0].slice(0, 160));
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[95] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Connect a wallet"
        >
          <motion.div
            className="panel relative w-full max-w-md p-6"
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 12, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" aria-label="Close" onClick={onClose} className="absolute top-4 right-4 rounded-md p-1 text-bone-3 transition hover:text-bone">
              <X size={16} />
            </button>
            <div className="flex items-center gap-3">
              <BatMark size={12} />
              <h2 className="display text-lg tracking-wide">Connect</h2>
            </div>
            <p className="mt-2 text-sm text-bone-2">Robinhood Chain · 4663. VAMP never asks for anything but a signature on the launch.</p>

            <ul className="mt-5 flex flex-col gap-2">
              {list.map((c) => (
                <li key={c.uid}>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => pick(c.uid)}
                    className="flex w-full items-center gap-3 rounded-xl border border-graphite-2 bg-white/[0.02] px-4 py-3 text-left transition hover:border-blood/60 hover:bg-white/[0.04] disabled:opacity-60"
                  >
                    {c.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.icon} alt="" className="h-7 w-7 rounded-md" />
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-graphite text-chrome">
                        <BatMark size={7} variant="solid" />
                      </span>
                    )}
                    <span className="flex-1 text-sm font-medium">{c.name}</span>
                    {pendingId === c.uid ? <BatLoader size={10} className="text-blood-3" /> : <span className="label">{c.type === "walletConnect" ? "QR" : "Browser"}</span>}
                  </button>
                </li>
              ))}
              {list.length === 0 ? <li className="rounded-xl border border-dashed border-graphite-3 p-4 text-sm text-bone-2">No wallet found in this browser. Install one, or configure WalletConnect.</li> : null}
            </ul>

            {!hasWalletConnect ? <p className="mt-4 text-[11px] leading-relaxed text-bone-3">WalletConnect is off: set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID to offer mobile wallets.</p> : null}
            {failed || error ? (
              <p className="mt-3 text-xs text-blood-3" role="alert">
                {failed ?? error?.message}{" "}
                <button type="button" className="underline" onClick={() => (setFailed(null), reset())}>
                  dismiss
                </button>
              </p>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
