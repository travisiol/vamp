import { recentVamps } from "@/lib/launches";

export const dynamic = "force-dynamic";

/** Recent vamps read from the chain (cached 45 s in memory). Never sample data — the client decides what to show when this is empty. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(60, Math.max(1, Number(url.searchParams.get("limit") ?? 24) || 24));
  try {
    const data = await recentVamps(limit);
    return Response.json(data, { headers: { "cache-control": "public, max-age=20, stale-while-revalidate=60" } });
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "Could not read the chain." }, { status: 502 });
  }
}
