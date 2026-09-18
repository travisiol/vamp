import { HomeClient } from "@/components/home/HomeClient";
import { HowItWorks } from "@/components/home/HowItWorks";
import { NetworkSection, RecentVampsSection } from "@/components/home/Sections";

export default function Home() {
  return (
    <main>
      <HomeClient />
      <HowItWorks />
      <RecentVampsSection />
      <NetworkSection />
    </main>
  );
}
