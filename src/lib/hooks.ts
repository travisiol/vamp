"use client";

import { useCallback, useSyncExternalStore } from "react";

/** True once hydrated; false during SSR and the first client render. */
export const useMounted = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

/** A media query as a subscription — no setState in an effect. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => serverValue);
}

/** Small screens and touch devices get the SVG bat instead of WebGL. */
export const useLightweight = () => useMediaQuery("(max-width: 767px), (pointer: coarse)");

export const usePrefersReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");

/** Whether WebGL should drive the bat right now. */
export function useWebglBat(): boolean {
  const light = useLightweight();
  const reduced = usePrefersReducedMotion();
  return !light && !reduced;
}
