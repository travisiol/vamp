/**
 * The bat, as three polygons in a 200×100 box (x to the right, y down —
 * SVG coordinates). The SVG mark draws them as-is; the WebGL bat extrudes
 * the same points, so the emblem in the nav and the chrome bat in the hero
 * are one shape.
 */
export type Pt = readonly [number, number];

export const BAT_BOX = { w: 200, h: 100 } as const;

/** The body: ears, chest, a short tail. Symmetric around x = 100. */
export const BODY: Pt[] = [
  [94, 2],
  [100, 14],
  [106, 2],
  [109, 17],
  [112, 30],
  [110, 44],
  [106, 58],
  [100, 76],
  [94, 58],
  [90, 44],
  [88, 30],
  [91, 17],
];

/** The right wing, root first. Long swept blade, two scallops. */
export const WING_R: Pt[] = [
  [110, 24],
  [140, 14],
  [170, 5],
  [200, 0],
  [174, 26],
  [168, 48],
  [140, 36],
  [130, 56],
  [114, 46],
  [108, 52],
];

/** Where a wing hinges: the middle of its root, in box units. */
export const WING_HINGE: Pt = [110, 38];

export const WING_L: Pt[] = WING_R.map(([x, y]) => [BAT_BOX.w - x, y] as const);

export const toPoints = (pts: Pt[]) => pts.map(([x, y]) => `${x},${y}`).join(" ");

/** Centre of the box — the bat's origin in world space. */
export const BAT_CENTER: Pt = [100, 40];
