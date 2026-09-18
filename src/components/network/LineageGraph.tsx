"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatEth, timeAgo, vampAddress } from "@/lib/format";
import type { LaunchCard } from "@/lib/launches";
import { pons } from "@/lib/robinhood";
import type { FeedMode } from "@/lib/useVamps";

type Node = {
  id: string;
  kind: "source" | "vamp";
  label: string;
  name: string;
  x: number;
  y: number;
  /** Where the layout wants this node; the simulation only relaxes overlaps around it. */
  ax: number;
  ay: number;
  vx: number;
  vy: number;
  card?: LaunchCard;
  degree: number;
  seed: number;
};
type Edge = { a: number; b: number; seed: number };

function hash01(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
}

/**
 * Constellations: every source token is a hub placed evenly on a ring, its
 * vamps orbit it on the side facing away from the centre. Deterministic —
 * the same data always draws the same map.
 */
function buildGraph(cards: LaunchCard[], w: number, h: number, mode: FeedMode): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const index = new Map<string, number>();
  // Unlinked launches on a ring stay legible up to about twenty.
  if (mode === "recent") cards = cards.slice(0, 20);
  const add = (n: Omit<Node, "x" | "y" | "ax" | "ay" | "vx" | "vy" | "degree" | "seed">) => {
    const key = n.id.toLowerCase();
    const i = index.get(key);
    if (i !== undefined) return i;
    nodes.push({ ...n, x: w / 2, y: h / 2, ax: w / 2, ay: h / 2, vx: 0, vy: 0, degree: 0, seed: hash01(key) });
    index.set(key, nodes.length - 1);
    return nodes.length - 1;
  };
  const edges: Edge[] = [];
  const children = new Map<number, number[]>();
  const orphans: number[] = [];
  for (const c of cards) {
    // While nobody has been vamped, the map shows the latest launches as sources-to-be: white, unlinked.
    const v = add({ id: c.token, kind: mode === "recent" ? "source" : "vamp", label: c.symbol ? `$${c.symbol}` : vampAddress(c.token), name: c.name, card: c });
    if (c.source) {
      const s = add({ id: c.source, kind: "source", label: c.sourceSymbol ? `$${c.sourceSymbol}` : vampAddress(c.source), name: c.sourceName ?? "" });
      edges.push({ a: s, b: v, seed: hash01(c.token) });
      nodes[s].degree++;
      nodes[v].degree++;
      const list = children.get(s);
      if (list) list.push(v);
      else children.set(s, [v]);
    } else orphans.push(v);
  }

  const hubs = [...children.keys()].sort((a, b) => nodes[b].degree - nodes[a].degree || nodes[a].label.localeCompare(nodes[b].label));
  const cx = w / 2;
  const cy = h / 2;
  const rx = Math.min(w * (hubs.length ? 0.3 : 0.38), hubs.length ? 380 : 520);
  const ry = Math.min(h * (hubs.length ? 0.28 : 0.36), hubs.length ? 210 : 300);
  hubs.forEach((hub, i) => {
    const single = hubs.length === 1;
    const a = single ? 0 : -Math.PI / 2 + (Math.PI * 2 * i) / hubs.length;
    const hx = single ? cx : cx + Math.cos(a) * rx;
    const hy = single ? cy : cy + Math.sin(a) * ry;
    const n = nodes[hub];
    n.ax = hx;
    n.ay = hy;
    const kids = children.get(hub) ?? [];
    const m = kids.length;
    const radius = 54 + Math.min(46, m * 7);
    const arc = single ? Math.PI * 2 : Math.min(Math.PI * 1.25, 0.6 * (m - 1) + 0.5);
    kids.forEach((kid, j) => {
      const t = m === 1 ? 0 : j / (m - 1) - 0.5;
      const ang = single ? (Math.PI * 2 * j) / m - Math.PI / 2 : a + t * arc;
      const c = nodes[kid];
      c.ax = hx + Math.cos(ang) * radius;
      c.ay = hy + Math.sin(ang) * radius;
    });
  });
  orphans.forEach((o, i) => {
    // No hubs at all: the orphans take the ring themselves. Otherwise they sit outside it.
    const scale = hubs.length ? 1.35 : 1;
    const a = -Math.PI / 2 + (Math.PI * 2 * i) / orphans.length + (hubs.length ? 0.3 : 0);
    const n = nodes[o];
    n.ax = cx + Math.cos(a) * rx * scale;
    n.ay = cy + Math.sin(a) * ry * scale;
  });
  // Everything inside the box; start on the anchors.
  for (const n of nodes) {
    n.ax = Math.max(40, Math.min(w - 40, n.ax));
    n.ay = Math.max(36, Math.min(h - 40, n.ay));
    n.x = n.ax;
    n.y = n.ay;
  }
  return { nodes, edges };
}

/**
 * The lineage: source tokens as white hubs, vamps as red satellites, one
 * thin red line per vamp with a slow pulse travelling from the source.
 * Hovering a node shows the token; the rest of the map steps back.
 */
export function LineageGraph({ cards, height = 520, mode = "vamps" }: { cards: LaunchCard[]; height?: number; mode?: FeedMode }) {
  const sample = mode === "sample";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ node: Node; x: number; y: number; wrapW: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const h = height;
    let w = wrap.clientWidth || 800;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let graph = buildGraph(cards, w, h, mode);
    const size = () => {
      w = wrap.clientWidth || 800;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      graph = buildGraph(cards, w, h, mode);
    };
    size();
    let hovered: Node | null = null;
    let raf = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mono = "500 10px var(--font-jetbrains), ui-monospace, monospace";

    const relax = () => {
      const { nodes } = graph;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const min = a.kind === "source" || b.kind === "source" ? 46 : 30;
          if (d < min) {
            const f = ((min - d) / min) * 0.6;
            a.vx += (dx / d) * f;
            a.vy += (dy / d) * f;
            b.vx -= (dx / d) * f;
            b.vy -= (dy / d) * f;
          }
        }
      }
      for (const n of nodes) {
        n.vx += (n.ax - n.x) * 0.06;
        n.vy += (n.ay - n.y) * 0.06;
        n.vx *= 0.78;
        n.vy *= 0.78;
        n.x += n.vx;
        n.y += n.vy;
      }
    };

    const connected = (n: Node) =>
      hovered !== null && (hovered === n || graph.edges.some((e) => (graph.nodes[e.a] === hovered && graph.nodes[e.b] === n) || (graph.nodes[e.b] === hovered && graph.nodes[e.a] === n)));

    const draw = (t: number) => {
      const { nodes, edges } = graph;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const bob = (n: Node) => (reduced ? 0 : Math.sin(t / 1400 + n.seed * 6.28) * 1.5);

      // The orbit the hubs sit on — barely there, enough to say the layout is on purpose.
      if (nodes.filter((n) => n.kind === "source").length > 1) {
        ctx.beginPath();
        const linked = nodes.some((n) => n.degree > 0);
        ctx.ellipse(w / 2, h / 2, Math.min(w * (linked ? 0.3 : 0.38), linked ? 380 : 520), Math.min(h * (linked ? 0.28 : 0.36), linked ? 210 : 300), 0, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(241,241,237,0.05)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Lines, then the pulse that travels from the source to its vamp.
      for (const e of edges) {
        const a = nodes[e.a];
        const b = nodes[e.b];
        const ay = a.y + bob(a);
        const by = b.y + bob(b);
        const lit = hovered && (hovered === a || hovered === b);
        const dim = hovered && !lit;
        ctx.beginPath();
        ctx.moveTo(a.x, ay);
        ctx.lineTo(b.x, by);
        ctx.strokeStyle = lit ? "rgba(255,59,78,0.95)" : dim ? "rgba(211,19,42,0.12)" : "rgba(211,19,42,0.38)";
        ctx.lineWidth = lit ? 1.2 : 0.8;
        ctx.stroke();
        if (!reduced && !dim) {
          const p = (((t / 2800 + e.seed) % 1) + 1) % 1;
          const px = a.x + (b.x - a.x) * p;
          const py = ay + (by - ay) * p;
          ctx.beginPath();
          ctx.arc(px, py, 1.6, 0, Math.PI * 2);
          ctx.fillStyle = lit ? "rgba(255,120,130,1)" : "rgba(255,59,78,0.75)";
          ctx.fill();
        }
      }

      // Hubs and satellites.
      for (const n of nodes) {
        const lit = connected(n);
        const dim = hovered && !lit;
        const x = n.x;
        const y = n.y + bob(n);
        if (n.kind === "source") {
          const glow = ctx.createRadialGradient(x, y, 0, x, y, 26);
          glow.addColorStop(0, `rgba(255,255,255,${dim ? 0.04 : 0.16})`);
          glow.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, 26, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y, 11, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(241,241,237,${dim ? 0.08 : lit ? 0.5 : 0.22})`;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(x, y, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = dim ? "rgba(241,241,237,0.35)" : "#f1f1ed";
          ctx.fill();
          ctx.font = mono;
          ctx.textAlign = "center";
          ctx.fillStyle = dim ? "rgba(165,165,159,0.3)" : "rgba(241,241,237,0.85)";
          ctx.fillText(n.label, x, y + 25);
        } else {
          const glow = ctx.createRadialGradient(x, y, 0, x, y, 12);
          glow.addColorStop(0, `rgba(211,19,42,${dim ? 0.05 : lit ? 0.45 : 0.28})`);
          glow.addColorStop(1, "rgba(211,19,42,0)");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y, 3.8, 0, Math.PI * 2);
          ctx.fillStyle = dim ? "rgba(211,19,42,0.35)" : lit ? "#ff3b4e" : "#d3132a";
          ctx.fill();
          if (lit || n.degree === 0) {
            ctx.font = mono;
            ctx.textAlign = "center";
            ctx.fillStyle = "rgba(255,120,130,0.9)";
            ctx.fillText(n.label, x, y + 16);
          }
        }
      }
    };

    const loop = (t: number) => {
      relax();
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      let best: Node | null = null;
      let bd = 18 * 18;
      for (const n of graph.nodes) {
        const dx = n.x - px;
        const dy = n.y - py;
        const d = dx * dx + dy * dy;
        if (d < bd) {
          bd = d;
          best = n;
        }
      }
      if (best !== hovered) {
        hovered = best;
        setHover(best ? { node: best, x: best.x, y: best.y, wrapW: w } : null);
        canvas.style.cursor = best ? "pointer" : "default";
      }
    };
    const onLeave = () => {
      hovered = null;
      setHover(null);
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", size);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", size);
    };
  }, [cards, height, mode]);

  const n = hover?.node;
  const s = n?.card?.stats;
  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden rounded-3xl border border-graphite-2 bg-[radial-gradient(ellipse_at_center,#0b0b0c_0%,#050505_70%)]" style={{ height }}>
      <canvas ref={canvasRef} className="block" aria-label="Vamp network graph" role="img" />
      <div className="pointer-events-none absolute top-4 left-4 flex flex-wrap items-center gap-4">
        <span className="label flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-bone" /> {mode === "recent" ? "Launched on Pons · not vamped yet" : "Source token"}
        </span>
        {mode === "recent" ? null : (
          <span className="label flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blood-2" /> Vamp
          </span>
        )}
        {sample ? <span className="badge badge-chrome pointer-events-auto">Sample</span> : null}
      </div>
      {n ? (
        <div className="pointer-events-none absolute z-10 w-56 rounded-xl border border-graphite-3 bg-void/95 p-3 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] backdrop-blur" style={{ left: Math.min(hover!.x + 14, hover!.wrapW - 236), top: Math.max(8, hover!.y - 20) }}>
          <p className="label text-[9px]">{mode === "recent" ? "Launched on Pons" : n.kind === "source" ? "Source token" : "Vamped token"}</p>
          <p className="mt-1 truncate text-sm font-semibold">{n.name || n.label}</p>
          <p className="mono text-xs text-bone-2">
            {n.label} · {vampAddress(n.id)}
          </p>
          {n.card ? (
            <p className="mono mt-2 text-[11px] text-bone-3">
              {timeAgo(n.card.launchedAt)}
              {s ? ` · MC ${formatEth(BigInt(s.marketCapWei), 2)} ETH · ${s.trades} trades` : ""}
              {n.card.source ? ` · from ${vampAddress(n.card.source)}` : mode === "recent" ? " · not vamped yet" : ""}
            </p>
          ) : (
            <p className="mono mt-2 text-[11px] text-bone-3">Vamped {n.degree} time{n.degree === 1 ? "" : "s"}</p>
          )}
          {!sample ? (
            <p className="pointer-events-auto mt-2 text-[11px]">
              {n.kind === "source" ? (
                <Link href={`/?ca=${n.id}`} className="text-blood-3 underline-offset-2 hover:underline">
                  Vamp it →
                </Link>
              ) : (
                <a href={pons.token(n.id)} target="_blank" rel="noreferrer" className="text-blood-3 underline-offset-2 hover:underline">
                  View on Pons →
                </a>
              )}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
