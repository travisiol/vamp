import { hasImageUploads } from "@/config/contracts";

export const dynamic = "force-dynamic";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

/** Whether uploads are configured, so the editor can say so before anyone picks a file. */
export async function GET() {
  return Response.json({ enabled: hasImageUploads() });
}

/**
 * Pin a token image to IPFS through Pinata. Needs PINATA_JWT (server only).
 * Returns { cid, uri } with uri = ipfs://<cid>, the form Pons stores on chain.
 */
export async function POST(request: Request) {
  const jwt = process.env.PINATA_JWT?.trim();
  if (!jwt) return Response.json({ error: "Image uploads are not configured on this deployment (PINATA_JWT)." }, { status: 501 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return Response.json({ error: "Send the image as the `image` field." }, { status: 400 });
  if (!TYPES.has(file.type)) return Response.json({ error: "PNG, JPEG, WebP or GIF only." }, { status: 415 });
  if (file.size > MAX_BYTES) return Response.json({ error: "5 MB maximum." }, { status: 413 });

  const body = new FormData();
  body.set("file", file, file.name || "token-image");
  body.set("pinataMetadata", JSON.stringify({ name: `vamp:${file.name || "image"}` }));
  const r = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", { method: "POST", headers: { authorization: `Bearer ${jwt}` }, body });
  if (!r.ok) return Response.json({ error: `Pinata answered ${r.status}.` }, { status: 502 });
  const data = (await r.json()) as { IpfsHash?: string };
  if (!data.IpfsHash) return Response.json({ error: "Pinata returned no CID." }, { status: 502 });
  return Response.json({ cid: data.IpfsHash, uri: `ipfs://${data.IpfsHash}` });
}
