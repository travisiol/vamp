import { BODY, WING_L, WING_R, toPoints } from "@/lib/batShape";

/** The loading state: a small bat, wings slowly opening and closing. Never a spinner. */
export function BatLoader({ size = 18, className = "", label = "Loading" }: { size?: number; className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 200 100" width={size * 2} height={size} className={`bat-loader ${className}`} role="img" aria-label={label}>
      <g className="wing-l">
        <polygon fill="currentColor" points={toPoints(WING_L)} />
      </g>
      <g className="wing-r">
        <polygon fill="currentColor" points={toPoints(WING_R)} />
      </g>
      <polygon fill="currentColor" points={toPoints(BODY)} />
    </svg>
  );
}
