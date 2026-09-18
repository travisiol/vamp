import * as THREE from "three";
import { BAT_CENTER, BODY, WING_HINGE, WING_L, WING_R, type Pt } from "@/lib/batShape";

/** Box units (200×100) → world units: the bat is 2 units wide at scale 1. */
const S = 0.01;

function shapeFrom(pts: Pt[], origin: Pt): THREE.Shape {
  const shape = new THREE.Shape();
  pts.forEach(([x, y], i) => {
    const X = (x - origin[0]) * S;
    const Y = -(y - origin[1]) * S;
    if (i === 0) shape.moveTo(X, Y);
    else shape.lineTo(X, Y);
  });
  shape.closePath();
  return shape;
}

/**
 * A flat cap reflects one direction and reads as a grey sticker. Tilting the
 * cap normals away from the shape's centre — without moving a vertex — makes
 * the surface shade like a shallow dome, so chrome gradients sweep across it.
 */
function domeCaps(g: THREE.BufferGeometry, pts: Pt[], origin: Pt, strength: number) {
  const cx = (pts.reduce((a, p) => a + p[0], 0) / pts.length - origin[0]) * S;
  const cy = -(pts.reduce((a, p) => a + p[1], 0) / pts.length - origin[1]) * S;
  const pos = g.getAttribute("position") as THREE.BufferAttribute;
  const nor = g.getAttribute("normal") as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const nz = nor.getZ(i);
    if (Math.abs(nz) < 0.98) continue; // bevels and sides keep their normals
    const sign = Math.sign(nz);
    v.set((pos.getX(i) - cx) * strength * sign, (pos.getY(i) - cy) * strength * sign, sign).normalize();
    nor.setXYZ(i, v.x, v.y, v.z);
  }
  nor.needsUpdate = true;
}

export type BatGeometry = {
  body: THREE.BufferGeometry;
  wingR: THREE.BufferGeometry;
  wingL: THREE.BufferGeometry;
  /** Hinge positions in body space, world units. */
  hingeR: [number, number, number];
  hingeL: [number, number, number];
  dispose: () => void;
};

/**
 * The chrome bat: the emblem's three polygons extruded with a bevel, like a
 * badge stamped out of metal. Wings are built around their hinge so they
 * fold with a plain rotation.
 */
export function buildBatGeometry(quality: "high" | "low" = "high"): BatGeometry {
  const depth = 0.07;
  const opts: THREE.ExtrudeGeometryOptions = {
    depth,
    bevelEnabled: true,
    bevelThickness: quality === "high" ? 0.028 : 0.02,
    bevelSize: quality === "high" ? 0.022 : 0.016,
    bevelSegments: quality === "high" ? 5 : 2,
    curveSegments: 1,
  };
  const make = (pts: Pt[], origin: Pt, dome: number) => {
    const g = new THREE.ExtrudeGeometry(shapeFrom(pts, origin), opts);
    g.translate(0, 0, -depth / 2);
    g.computeVertexNormals();
    domeCaps(g, pts, origin, dome);
    return g;
  };
  const hingeL: Pt = [200 - WING_HINGE[0], WING_HINGE[1]];
  const toBody = (p: Pt): [number, number, number] => [(p[0] - BAT_CENTER[0]) * S, -(p[1] - BAT_CENTER[1]) * S, 0];
  const body = make(BODY, BAT_CENTER, 1.1);
  const wingR = make(WING_R, WING_HINGE, 0.55);
  const wingL = make(WING_L, hingeL, 0.55);
  return {
    body,
    wingR,
    wingL,
    hingeR: toBody(WING_HINGE),
    hingeL: toBody(hingeL),
    dispose: () => {
      body.dispose();
      wingR.dispose();
      wingL.dispose();
    },
  };
}
