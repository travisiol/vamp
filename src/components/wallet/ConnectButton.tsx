"use client";

import { ChevronDown, Copy, ExternalLink, LogOut } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useConnection, useDisconnect, useSwitchChain } from "wagmi";
import { CHAIN_ID } from "@/config/contracts";
import { shortAddress } from "@/lib/format";
import { explorer } from "@/lib/robinhood";
import { toast } from "@/lib/toast";
import { ConnectDialog } from "./ConnectDialog";

const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

export function ConnectButton({ size = "sm" }: { size?: "sm" | "md" }) {
  const mounted = useMounted();
  const { address, isConnected, chainId } = useConnection();
  const { mutate: disconnect } = useDisconnect();
  const { mutateAsync: switchChain, isPending: switching } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menu]);

  const cls = size === "md" ? "btn btn-ghost" : "btn btn-ghost btn-sm";

  if (!mounted || !isConnected || !address) {
    return (
      <>
        <button type="button" className={cls} onClick={() => setOpen(true)}>
          Connect
        </button>
        <ConnectDialog open={open} onClose={() => setOpen(false)} />
      </>
    );
  }

  const wrongChain = chainId !== CHAIN_ID;

  return (
    <div className="relative" ref={menuRef}>
      {wrongChain ? (
        <button
          type="button"
          className={`${cls} border-blood-2/60 text-blood-3`}
          disabled={switching}
          onClick={() => switchChain({ chainId: CHAIN_ID }).catch((e: Error) => toast({ kind: "error", title: "Could not switch network", body: e.message.split("\n")[0] }))}
        >
          {switching ? "Switching…" : "Switch to Robinhood"}
        </button>
      ) : (
        <button type="button" className={`${cls} mono normal-case tracking-normal`} onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-haspopup="menu">
          <span className="h-1.5 w-1.5 rounded-full bg-blood-3 shadow-[0_0_8px_rgba(255,59,78,0.9)]" />
          {shortAddress(address)}
          <ChevronDown size={14} className="text-bone-3" />
        </button>
      )}
      {menu ? (
        <div role="menu" className="panel absolute right-0 mt-2 w-52 overflow-hidden p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]">
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-bone-2 transition hover:bg-white/[0.04] hover:text-bone"
            onClick={() => {
              navigator.clipboard.writeText(address).then(() => toast({ kind: "info", title: "Address copied" }));
              setMenu(false);
            }}
          >
            <Copy size={14} /> Copy address
          </button>
          <a role="menuitem" href={explorer.address(address)} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-bone-2 transition hover:bg-white/[0.04] hover:text-bone">
            <ExternalLink size={14} /> View on explorer
          </a>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-bone-2 transition hover:bg-white/[0.04] hover:text-blood-3"
            onClick={() => {
              disconnect();
              setMenu(false);
            }}
          >
            <LogOut size={14} /> Disconnect
          </button>
        </div>
      ) : null}
    </div>
  );
}
