"use client";

import { useQuery } from "@tanstack/react-query";
import { readFactoryEconomics, type FactoryEconomics } from "./pons";

/** Live numbers from the Pons factory: launch fee, graduation, supply, fee bps. Refreshed every minute. */
export function useEconomics() {
  return useQuery<FactoryEconomics>({
    queryKey: ["pons", "economics"],
    queryFn: () => readFactoryEconomics(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 2,
  });
}
