"use client";

import { useSyncExternalStore } from "react";

export type Toast = {
  id: number;
  kind: "success" | "error" | "info";
  title: string;
  body?: string;
  href?: string;
  hrefLabel?: string;
  ttl: number;
};

let toasts: Toast[] = [];
let seq = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(input: Omit<Toast, "id" | "ttl"> & { ttl?: number }): number {
  const id = seq++;
  const t: Toast = { ttl: input.kind === "error" ? 9000 : 6000, ...input, id };
  toasts = [...toasts, t];
  emit();
  window.setTimeout(() => dismiss(id), t.ttl);
  return id;
}

export function dismiss(id: number) {
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

export const useToasts = () => useSyncExternalStore(subscribe, () => toasts, () => toasts);
