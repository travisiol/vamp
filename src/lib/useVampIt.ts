"use client";

import { useCallback } from "react";
import { normalizeAddress, readSourceToken, SourceReadError } from "./pons";
import { actions, useVamp } from "./vampStore";

/** Paste → read the chain → start the extraction. One place, used by the hero and by every "vamp this" link. */
export function useVampIt() {
  const loading = useVamp((s) => s.loading);
  const vamp = useCallback(async (input: string) => {
    const address = normalizeAddress(input);
    if (!address) {
      actions.fail("Paste a contract address: 0x followed by 40 hex characters.");
      return false;
    }
    actions.setLoading(true);
    actions.fail(null);
    try {
      const source = await readSourceToken(address);
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("ca", address);
        window.history.replaceState(null, "", url.toString());
      } catch {
        /* history is a nicety */
      }
      actions.startExtraction(source);
      return true;
    } catch (e) {
      actions.fail(e instanceof SourceReadError ? e.message : "Could not read this token. Try again.");
      return false;
    } finally {
      actions.setLoading(false);
    }
  }, []);
  return { vamp, loading };
}
