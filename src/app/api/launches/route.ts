import { launchesByWallet } from "@/lib/launches";
import { normalizeAddress } from "@/lib/pons";

export const dynamic = "force-dynamic";

/** Every launch by a wallet (TokenLaunched.deployer), plus tokens this browser remembers, with live stats. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const wallet = normalizeAddress(url.searchParams.get("deployer"));
  if (!wallet) return Response.json({ error: "deployer must be an address" }, { status: 400 });
  const extra = (url.searchParams.get("tokens") ?? "")
    .split(",")
    .map((t) => normalizeAddress(t))
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .slice(0, 50);
  try {
    const data = await launchesByWallet(wallet, extra);
    return Response.json(data, { headers: { "cache-control": "private, max-age=10" } });
  } catch (e) {
    return Response.json({ error: (e as Error).message ?? "Could not read the chain." }, { status: 502 });
  }
}
