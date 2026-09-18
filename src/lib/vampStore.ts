"use client";

import { useSyncExternalStore } from "react";
import type { Address } from "viem";
import { EMPTY_SOCIALS, type FactoryEconomics, type LaunchResult, type SourceToken, type VampDraft } from "./pons";

/**
 * The session, as one small external store. Components subscribe to the
 * slice they need through useVamp(selector); the 3D scene reads getState()
 * from inside its frame loop without re-rendering anything.
 */

export type Stage = "intro" | "hero" | "extracting" | "editor" | "releasing" | "live";

export type MeterKey = "name" | "ticker" | "image" | "description" | "links";
export const METER_KEYS: MeterKey[] = ["name", "ticker", "image", "description", "links"];

export type VampState = {
  stage: Stage;
  input: string;
  loading: boolean;
  error: string | null;
  source: SourceToken | null;
  draft: VampDraft | null;
  eco: FactoryEconomics | null;
  result: LaunchResult | null;
  /** What the extraction has pulled so far — drives the VAMP METER. */
  extracted: Record<MeterKey, boolean>;
  /** Set once the intro has played (or been skipped) this session. */
  introDone: boolean;
};

const EMPTY_EXTRACTED: Record<MeterKey, boolean> = { name: false, ticker: false, image: false, description: false, links: false };

let state: VampState = {
  stage: "intro",
  input: "",
  loading: false,
  error: null,
  source: null,
  draft: null,
  eco: null,
  result: null,
  extracted: { ...EMPTY_EXTRACTED },
  introDone: false,
};

const listeners = new Set<() => void>();

export function getState(): VampState {
  return state;
}

export function setState(patch: Partial<VampState> | ((s: VampState) => Partial<VampState>)): void {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useVamp<T>(selector: (s: VampState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state), () => selector(state));
}

/** The draft a source token turns into: everything it exposes, ready to edit. */
export function draftFromSource(source: SourceToken): VampDraft {
  return {
    name: source.name,
    symbol: source.symbol,
    description: source.description,
    logo: source.logo,
    socials: { ...EMPTY_SOCIALS, ...source.socials, farcaster: source.socials.farcaster.startsWith("vamp:") ? "" : source.socials.farcaster },
    devBuyEth: "",
    creatorWallet: "",
    creatorTaxPct: 1,
    buybackEnabled: false,
    snipeExemptions: [],
    tagProvenance: true,
  };
}

/** What the source actually had, so the meter and the particles tell the truth. */
export function extractedFromSource(source: SourceToken): Record<MeterKey, boolean> {
  const links = Object.entries(source.socials).some(([k, v]) => k !== "farcaster" && v.trim());
  return { name: Boolean(source.name), ticker: Boolean(source.symbol), image: Boolean(source.logo), description: Boolean(source.description), links };
}

export const actions = {
  finishIntro() {
    setState((s) => ({ introDone: true, stage: s.stage === "intro" ? "hero" : s.stage }));
  },
  setInput(input: string) {
    setState({ input, error: null });
  },
  startExtraction(source: SourceToken) {
    setState({ source, draft: draftFromSource(source), stage: "extracting", extracted: { ...EMPTY_EXTRACTED }, error: null, result: null });
  },
  markExtracted(key: MeterKey) {
    setState((s) => (s.extracted[key] ? {} : { extracted: { ...s.extracted, [key]: true } }));
  },
  enterEditor() {
    setState((s) => ({ stage: "editor", extracted: s.source ? extractedFromSource(s.source) : s.extracted }));
  },
  updateDraft(patch: Partial<VampDraft>) {
    setState((s) => (s.draft ? { draft: { ...s.draft, ...patch } } : {}));
  },
  setEconomics(eco: FactoryEconomics) {
    setState({ eco });
  },
  setStage(stage: Stage) {
    setState({ stage });
  },
  setLive(result: LaunchResult) {
    setState({ result, stage: "live" });
  },
  fail(error: string | null) {
    setState({ error, loading: false });
  },
  setLoading(loading: boolean) {
    setState({ loading });
  },
  reset() {
    setState({ stage: "hero", input: "", source: null, draft: null, result: null, error: null, loading: false, extracted: { ...EMPTY_EXTRACTED } });
  },
  /** Start over from a token address (deep links, "vamp this" from a card). */
  vampAddress(address: Address) {
    setState({ input: address, stage: "hero", source: null, draft: null, result: null, error: null, extracted: { ...EMPTY_EXTRACTED }, introDone: true });
  },
};
