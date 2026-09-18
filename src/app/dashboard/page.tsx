import type { Metadata } from "next";
import { Coven } from "@/components/dashboard/Coven";

export const metadata: Metadata = { title: "Dashboard", description: "Your coven: every vamp you launched, fees, volume." };

export default function DashboardPage() {
  return <Coven />;
}
