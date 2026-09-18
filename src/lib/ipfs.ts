/**
 * Pons stores `ipfs://<cid>` on chain. A string that comes from a contract is
 * never trusted: only ipfs:// (a bare CID plus an optional plain path) and
 * https:// are turned into something an <img> may load.
 */
export function imageCandidates(logo: string | null | undefined): string[] {
  const v = (logo ?? "").trim();
  if (!v) return [];
  const ipfs = /^ipfs:\/\/(?:ipfs\/)?([A-Za-z0-9]+)((?:\/[A-Za-z0-9._-]+)*)\/?$/.exec(v);
  if (ipfs && !/(^|\/)\.\.?(\/|$)/.test(ipfs[2] || "")) {
    const path = `${ipfs[1]}${ipfs[2] || ""}`;
    return [`https://gateway.pinata.cloud/ipfs/${path}`, `https://www.ponsfamily.com/api/ipfs/content/${path}`, `https://ipfs.io/ipfs/${path}`];
  }
  if (/^https:\/\//i.test(v)) return [v];
  return [];
}

/** A logo string the factory will accept and gateways will show. */
export function isDisplayableLogo(logo: string): boolean {
  return imageCandidates(logo).length > 0;
}

/** Normalize what a person pastes: a bare CID, a gateway URL or an ipfs:// URI → ipfs://cid. */
export function normalizeLogoInput(input: string): string {
  const v = input.trim();
  if (!v) return "";
  const gateway = /^https?:\/\/[^/]+\/ipfs\/([A-Za-z0-9]+(?:\/[A-Za-z0-9._-]+)*)\/?$/i.exec(v);
  if (gateway) return `ipfs://${gateway[1]}`;
  if (/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|ba[a-z2-7]{50,})$/.test(v)) return `ipfs://${v}`;
  return v;
}

export type UploadResult = { cid: string; uri: string };

/** POST the file to /api/upload (Pinata behind it). Throws with a readable message. */
export async function uploadImage(file: File): Promise<UploadResult> {
  const body = new FormData();
  body.set("image", file);
  const r = await fetch("/api/upload", { method: "POST", body });
  const data = (await r.json().catch(() => ({}))) as Partial<UploadResult> & { error?: string };
  if (!r.ok || !data.cid || !data.uri) throw new Error(data.error ?? `Upload failed (${r.status}).`);
  return { cid: data.cid, uri: data.uri };
}
