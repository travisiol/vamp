import { ethUsdForDisplay } from "@/lib/prices";

export const dynamic = "force-dynamic";

export async function GET() {
  const price = await ethUsdForDisplay();
  return Response.json({ price }, { headers: { "cache-control": "public, max-age=60" } });
}
