"use client";

import { useState } from "react";
import { BatMark } from "@/components/brand/BatMark";

/** RELEASE THE VAMP. The bat above it opens its wings when you hover. */
export function ReleaseButton({ onClick, disabled, reason }: { onClick: () => void; disabled?: boolean; reason?: string | null }) {
  const [hover, setHover] = useState(false);
  return (
    <div className="flex flex-col items-center">
      <div className={`mb-3 transition-transform duration-700 ${hover && !disabled ? "-translate-y-1 scale-110" : ""}`} aria-hidden>
        <BatMark size={22} wings={hover && !disabled ? 1 : 0.35} />
      </div>
      <button
        type="button"
        className="btn btn-blood btn-lg w-full max-w-[380px]"
        disabled={disabled}
        onClick={onClick}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
      >
        Release the vamp
      </button>
      {reason ? <p className="mt-3 text-center text-xs text-bone-3">{reason}</p> : null}
    </div>
  );
}
