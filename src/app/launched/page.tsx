import type { Metadata } from "next";
import { LaunchedPage } from "@/components/vamps/LaunchedPage";

export const metadata: Metadata = { title: "Launched", description: "Recently vamped tokens on Robinhood Chain." };

export default function Page() {
  return <LaunchedPage />;
}
