"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BatMark } from "@/components/brand/BatMark";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { WING_L, WING_R, toPoints } from "@/lib/batShape";
import { actions } from "@/lib/vampStore";

const LINKS = [
  { href: "/", label: "Vamp" },
  { href: "/launched", label: "Launched" },
  { href: "/network", label: "Network" },
  { href: "/dashboard", label: "Dashboard" },
] as const;

/** Two wings under the link — the underline. */
function WingUnderline() {
  return (
    <svg className="wing text-blood-2" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden>
      <polygon fill="currentColor" points={toPoints(WING_L.map(([x, y]) => [x, y] as const))} />
      <polygon fill="currentColor" points={toPoints(WING_R)} />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    const id = window.setTimeout(onScroll, 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(id);
  }, [pathname]);

  const solid = scrolled || open;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[80] transition-[background-color,border-color,backdrop-filter] duration-500 ${
        solid ? "border-b border-graphite-2 bg-void/75 backdrop-blur-md" : "border-b border-transparent bg-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="Main">
        <Link href="/" className="group flex items-center gap-3" onClick={() => pathname === "/" && actions.reset()}>
          <BatMark size={14} className="transition-transform duration-500 group-hover:scale-110" />
          <span className="display text-[1.35rem] leading-none tracking-[0.04em]">VAMP</span>
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="nav-link" aria-current={pathname === l.href ? "page" : undefined}>
                {l.label}
                <WingUnderline />
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3">
          <ConnectButton />
          <button type="button" className="rounded-lg p-2 text-bone-2 transition hover:text-bone md:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {open ? (
        <div className="border-t border-graphite-2 bg-void/95 px-5 py-4 backdrop-blur-md md:hidden">
          <ul className="flex flex-col gap-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={`block rounded-lg px-3 py-3 text-sm tracking-wide ${pathname === l.href ? "bg-graphite text-bone" : "text-bone-2"}`}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}
