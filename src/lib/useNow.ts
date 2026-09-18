"use client";

import { useSyncExternalStore } from "react";

let cached = 0;
let timer: number | undefined;
const listeners = new Set<() => void>();

function subscribe(l: () => void) {
  listeners.add(l);
  if (!timer) {
    cached = Date.now();
    timer = window.setInterval(() => {
      cached = Date.now();
      listeners.forEach((f) => f());
    }, 10_000);
  }
  return () => {
    listeners.delete(l);
    if (!listeners.size && timer) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

/** A shared clock, ticking every 10 s. 0 on the server so nothing temporal lands in the HTML. */
export const useNow = () => useSyncExternalStore(subscribe, () => cached || (cached = Date.now()), () => 0);
