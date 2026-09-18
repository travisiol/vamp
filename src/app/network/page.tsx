import type { Metadata } from "next";
import { NetworkPage } from "@/components/network/NetworkPage";

export const metadata: Metadata = { title: "Network", description: "The lineage of vamped tokens on Robinhood Chain." };

export default function Page() {
  return <NetworkPage />;
}
