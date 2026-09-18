import { useId, type CSSProperties } from "react";
import { BODY, WING_HINGE, WING_L, WING_R, toPoints } from "@/lib/batShape";

type Props = {
  /** Height in px; the mark is 2:1. */
  size?: number;
  className?: string;
  /** chrome = the gradient emblem; solid = single colour (currentColor). */
  variant?: "chrome" | "solid" | "blood";
  /** 0 = folded, 1 = open. Folds the wings toward the body. */
  wings?: number;
  style?: CSSProperties;
  title?: string;
  /** Fill the parent instead of a fixed size. */
  fluid?: boolean;
};

/**
 * The bat as an SVG. Wings are separate groups scaled around their hinge, so
 * the same mark can idle in the nav, flap as a loader and open on hover.
 */
export function BatMark({ size = 20, className, variant = "chrome", wings = 1, style, title, fluid }: Props) {
  const id = useId();
  const gradId = `bat-chrome-${id}`;
  const bloodId = `bat-blood-${id}`;
  const fill = variant === "chrome" ? `url(#${gradId})` : variant === "blood" ? `url(#${bloodId})` : "currentColor";
  const fold = 0.12 + 0.88 * Math.max(0, Math.min(1, wings));
  const wingStyle = (dir: 1 | -1): CSSProperties => ({
    transform: `scaleX(${fold})`,
    transformOrigin: `${dir === 1 ? WING_HINGE[0] : 200 - WING_HINGE[0]}px ${WING_HINGE[1]}px`,
    transformBox: "view-box",
    transition: "transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
  });
  return (
    <svg viewBox="0 0 200 100" width={fluid ? undefined : size * 2} height={fluid ? undefined : size} className={className} style={style} aria-hidden={title ? undefined : true} role={title ? "img" : undefined}>
      {title ? <title>{title}</title> : null}
      {variant === "chrome" ? (
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.4" stopColor="#c9ccd1" />
            <stop offset="0.52" stopColor="#6f737b" />
            <stop offset="0.64" stopColor="#e8e9ec" />
            <stop offset="1" stopColor="#8b8f97" />
          </linearGradient>
        </defs>
      ) : variant === "blood" ? (
        <defs>
          <linearGradient id={bloodId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff5c6a" />
            <stop offset="0.55" stopColor="#d3132a" />
            <stop offset="1" stopColor="#7a0010" />
          </linearGradient>
        </defs>
      ) : null}
      <g style={wingStyle(-1)}>
        <polygon fill={fill} points={toPoints(WING_L)} />
      </g>
      <g style={wingStyle(1)}>
        <polygon fill={fill} points={toPoints(WING_R)} />
      </g>
      <polygon fill={fill} points={toPoints(BODY)} />
    </svg>
  );
}

/** Wing silhouette only — the translucent bat that appears behind hovered cards. */
export function BatSilhouette({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 200 100" className={className} style={style} aria-hidden>
      <polygon fill="currentColor" points={toPoints(WING_L)} />
      <polygon fill="currentColor" points={toPoints(WING_R)} />
      <polygon fill="currentColor" points={toPoints(BODY)} />
    </svg>
  );
}
