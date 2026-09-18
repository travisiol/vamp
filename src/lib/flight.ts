/**
 * Where the bat is, in screen pixels, updated every frame by whoever is
 * flying it (the WebGL scene on desktop, the SVG bat on mobile) and read by
 * whoever needs to draw towards it (the extraction overlay). A mutable
 * record on purpose: nothing here goes through React.
 */
export type FlightPose = {
  x: number;
  y: number;
  /** 0 = wings folded, 1 = fully open. */
  wings: number;
  /** Relative to the resting hero size. */
  scale: number;
  /** Radians, positive = banking right. */
  roll: number;
  visible: boolean;
};

export const flight: FlightPose = { x: 0, y: 0, wings: 1, scale: 1, roll: 0, visible: true };

export type ExtractionLayout = {
  /** Where the bat rests in the hero. */
  home: { x: number; y: number };
  /** Centre of the source card. */
  source: { x: number; y: number; w: number; h: number };
  /** Centre of the new token card. */
  target: { x: number; y: number; w: number; h: number };
};

export const EXTRACTION_MS = 2300;

/** Intro: the DOM overlay owns 0–1500 ms (pulse, two red points); the flight owns the rest. */
export const INTRO = { flightStart: 1500, flightEnd: 2950, end: 3400 } as const;

/** When each data stream leaves the source card, and how long it travels. */
export const STREAMS = [
  { key: "name", label: "NAME", start: 520, travel: 260 },
  { key: "ticker", label: "TICKER", start: 640, travel: 260 },
  { key: "image", label: "IMAGE", start: 760, travel: 260 },
  { key: "description", label: "DESCRIPTION", start: 880, travel: 260 },
  { key: "links", label: "LINKS", start: 1000, travel: 260 },
] as const;

export const T = {
  arrive: 480, // bat at the source card
  drainEnd: 1300, // last stream absorbed
  depart: 1320, // bat leaves for the target
  land: 1780, // bat above the target card
  fill: 1800, // target card starts filling
  stamp: 2000, // "VAMPED."
  end: EXTRACTION_MS,
} as const;

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;

function quad(p0: { x: number; y: number }, c: { x: number; y: number }, p1: { x: number; y: number }, t: number) {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
}

/** Cards stacked (phones) rather than side by side. */
export const isStacked = (L: ExtractionLayout) => L.target.y - L.source.y > L.source.h;

/** The bat hovers to the right of the source card, facing it (below it when stacked). */
export function drainPoint(L: ExtractionLayout) {
  if (isStacked(L)) return { x: L.source.x, y: L.source.y + L.source.h * 0.5 + 84 };
  return { x: L.source.x + L.source.w * 0.5 + Math.min(170, L.source.w * 0.6), y: L.source.y - L.source.h * 0.1 };
}

/** The bat lands above the new card. */
export function landPoint(L: ExtractionLayout) {
  return { x: L.target.x, y: L.target.y - L.target.h * 0.5 - (isStacked(L) ? 44 : 64) };
}

/** Where stream `i` leaves the source card. */
export function streamOrigin(L: ExtractionLayout, i: number) {
  if (isStacked(L)) return { x: L.source.x + (i - 2) * 22, y: L.source.y + L.source.h * 0.5 };
  return { x: L.source.x + L.source.w * 0.5, y: L.source.y + (i - 2) * 20 };
}

/** The pose of the bat `t` ms into the extraction. Pure; safe to call every frame. */
export function extractionPose(t: number, L: ExtractionLayout): FlightPose {
  const drain = drainPoint(L);
  const land = landPoint(L);
  if (t < T.arrive) {
    const k = easeInOut(clamp01(t / T.arrive));
    const p = quad(L.home, { x: (L.home.x + drain.x) / 2, y: Math.min(L.home.y, drain.y) - 90 }, drain, k);
    return { x: p.x, y: p.y, wings: 0.55 + 0.45 * Math.abs(Math.sin(t / 95)), scale: lerp(1, 0.4, k), roll: -0.35 * Math.sin(k * Math.PI), visible: true };
  }
  if (t < T.depart) {
    const k = (t - T.arrive) / 1000;
    return { x: drain.x + Math.sin(k * 5.2) * 3, y: drain.y + Math.sin(k * 3.7) * 4, wings: 0.7 + 0.3 * Math.abs(Math.sin(t / 140)), scale: 0.4, roll: -0.08, visible: true };
  }
  if (t < T.land) {
    const k = easeInOut(clamp01((t - T.depart) / (T.land - T.depart)));
    const p = quad(drain, { x: (drain.x + land.x) / 2, y: Math.min(drain.y, land.y) - 140 }, land, k);
    return { x: p.x, y: p.y, wings: 0.5 + 0.5 * Math.abs(Math.sin(t / 90)), scale: lerp(0.4, 0.46, k), roll: 0.3 * Math.sin(k * Math.PI), visible: true };
  }
  const k = (t - T.land) / 1000;
  return { x: land.x, y: land.y + Math.sin(k * 3) * 3, wings: 1, scale: 0.46, roll: 0, visible: true };
}

/** Progress 0..1 of stream `i` (its dot along the line), or -1 before it leaves, 2 once absorbed. */
export function streamProgress(t: number, i: number): number {
  const s = STREAMS[i];
  if (t < s.start) return -1;
  if (t > s.start + s.travel) return 2;
  return easeIn(clamp01((t - s.start) / s.travel));
}

/** Transient signals the bat reacts to; written by the UI, read by the scene every frame. */
export const signals = {
  /** Pointer over VAMP IT: the wings lift a little. */
  hover: false,
  /** Pointer position, -1..1 from the viewport centre. */
  mouseX: 0,
  mouseY: 0,
  /** When the intro started (performance.now()), 0 when not playing. */
  introStartedAt: 0,
  /** When the extraction started (performance.now()), 0 when not playing. */
  extractStartedAt: 0,
  /** Layout of the extraction stage, measured by the overlay. */
  layout: null as ExtractionLayout | null,
  /** Debug: freeze the extraction at this many ms (/?ca=…&t=900) to look at one frame. */
  freezeAt: null as number | null,
};
