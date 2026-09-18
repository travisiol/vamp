"use client";

import { Link2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { BatLoader } from "@/components/brand/BatLoader";
import { TokenLogo } from "@/components/ui/TokenLogo";
import { isDisplayableLogo, normalizeLogoInput, uploadImage } from "@/lib/ipfs";

type Props = {
  value: string;
  name: string;
  onChange: (logo: string) => void;
  /** Whether /api/upload has a Pinata key behind it (read once from /api/upload). */
  uploads: boolean | null;
};

/** The token image: the source's, reused as-is, or a new file / URL. */
export function ImageField({ value, name, onChange, uploads }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState("");

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return setError("PNG, JPEG, WebP or GIF.");
    if (file.size > 5 * 1024 * 1024) return setError("5 MB maximum.");
    setBusy(true);
    setError(null);
    try {
      const { uri } = await uploadImage(file);
      onChange(uri);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const applyUrl = () => {
    const v = normalizeLogoInput(url);
    if (!isDisplayableLogo(v)) return setError("Use an https:// link, an ipfs:// URI or a bare CID.");
    setError(null);
    onChange(v);
    setUrlMode(false);
    setUrl("");
  };

  return (
    <div>
      <span className="label mb-2 block">Token image</span>
      <div className="flex items-center gap-4 rounded-xl border border-graphite-2 bg-white/[0.015] p-3">
        <TokenLogo logo={value} name={name} size={64} />
        <div className="min-w-0 flex-1">
          <p className="mono truncate text-[11px] text-bone-2">{value || "No image on the source token"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {uploads !== false ? (
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy || uploads === null} onClick={() => fileRef.current?.click()}>
                {busy ? <BatLoader size={8} className="text-bone" /> : <Upload size={13} />} {value ? "Change" : "Upload"}
              </button>
            ) : null}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setUrlMode((v) => !v)}>
              <Link2 size={13} /> Paste URL
            </button>
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </div>
      {urlMode ? (
        <div className="mt-2 flex gap-2">
          <input className="input h-10 text-sm" placeholder="https://… or ipfs://…" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyUrl())} />
          <button type="button" className="btn btn-chrome btn-sm" onClick={applyUrl}>
            Use
          </button>
        </div>
      ) : null}
      {uploads === false ? <p className="mt-1.5 text-xs leading-relaxed text-bone-3">Uploads are off on this deployment (no PINATA_JWT). The source image is reused as-is; paste a link to change it.</p> : null}
      {error ? (
        <p className="mt-1.5 text-xs text-blood-3" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
