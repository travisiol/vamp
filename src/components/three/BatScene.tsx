"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { clamp01, easeIn, easeOut, extractionPose, flight, INTRO, lerp, signals } from "@/lib/flight";
import { useLightweight, usePrefersReducedMotion } from "@/lib/hooks";
import { getState, useVamp } from "@/lib/vampStore";
import { buildBatGeometry } from "./batGeometry";

const CAM_Z = 10;
const FOV = 34;
const visibleHeightAt = (z: number) => 2 * (CAM_Z - z) * Math.tan((FOV / 2) * (Math.PI / 180));

type Pose = { x: number; y: number; z: number; s: number; wings: number; roll: number; yaw: number; pitch: number; o: number };

function Bat({ quality }: { quality: "high" | "low" }) {
  const geo = useMemo(() => buildBatGeometry(quality), [quality]);
  useEffect(() => () => geo.dispose(), [geo]);

  const group = useRef<THREE.Group>(null);
  const wingR = useRef<THREE.Group>(null);
  const wingL = useRef<THREE.Group>(null);
  const cur = useRef<Pose>({ x: 0, y: 0, z: 0, s: 1, wings: 1, roll: 0, yaw: 0, pitch: 0, o: 0 });
  const heroScale = useRef(1);
  const stageSince = useRef({ stage: "", at: 0 });

  useFrame((st, dt) => {
    const g = group.current;
    if (!g) return;
    const now = performance.now();
    const s = getState();
    if (stageSince.current.stage !== s.stage) stageSince.current = { stage: s.stage, at: now };
    const sinceStage = now - stageSince.current.at;

    const w = st.size.width;
    const h = st.size.height;
    const vh = visibleHeightAt(0);
    const vw = vh * (w / h);
    const toWorld = (px: number, py: number): [number, number] => [(px / w - 0.5) * vw, (0.5 - py / h) * vh];
    const toScreen = (x: number, y: number): [number, number] => [(x / vw + 0.5) * w, (0.5 - y / vh) * h];

    const c = cur.current;
    const t: Pose = { ...c };
    let snap = false;
    let k = 7;

    if (s.stage === "intro") {
      snap = true;
      const it = signals.introStartedAt ? now - signals.introStartedAt : 0;
      if (it < INTRO.flightStart) {
        t.o = 0;
        t.z = -90;
        t.x = 0;
        t.y = 0.3;
        t.wings = 0.1;
        t.s = 1;
      } else {
        const p = clamp01((it - INTRO.flightStart) / (INTRO.flightEnd - INTRO.flightStart));
        const kz = easeIn(p);
        t.z = lerp(-90, CAM_Z + 4, kz);
        t.x = lerp(0, 0.9, kz);
        t.y = lerp(0.3, -0.35, kz);
        t.wings = lerp(0.1, 1, easeOut(clamp01(p * 1.25)));
        t.roll = Math.sin(it / 110) * 0.14 * (1 - kz);
        t.yaw = lerp(0, -0.35, kz);
        t.pitch = lerp(0.25, 0, kz);
        t.s = 1;
        t.o = t.z > CAM_Z - 0.6 ? 0 : 1;
      }
    } else if (s.stage === "hero") {
      const anchor = typeof document !== "undefined" ? document.getElementById("bat-anchor") : null;
      const rect = anchor?.getBoundingClientRect();
      if (rect && rect.width > 0) {
        const [x, y] = toWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
        heroScale.current = ((rect.width / w) * vw) / 2;
        t.x = x;
        t.y = y + Math.sin(now / 1300) * 0.05 * heroScale.current;
      }
      t.s = heroScale.current;
      const sy = typeof window !== "undefined" ? window.scrollY : 0;
      t.z = -Math.min(7, sy / 110);
      t.wings = 0.86 + 0.08 * Math.sin(now / 900) + (signals.hover ? 0.14 : 0);
      t.yaw = signals.mouseX * 0.3;
      t.pitch = -signals.mouseY * 0.18 + 0.04;
      t.roll = signals.mouseX * 0.04;
      // Materialize after the intro: grow in from small, fade in.
      const m = easeOut(clamp01(sinceStage / 900));
      t.s *= lerp(0.55, 1, m);
      t.o = clamp01(1 - sy / 650) * m;
      k = 6;
    } else if (s.stage === "extracting" && signals.layout) {
      const et = signals.freezeAt ?? (signals.extractStartedAt ? now - signals.extractStartedAt : 0);
      const p = extractionPose(et, signals.layout);
      const [x, y] = toWorld(p.x, p.y);
      t.x = x;
      t.y = y;
      t.z = 0;
      t.s = heroScale.current * p.scale;
      t.wings = p.wings;
      t.roll = p.roll;
      t.yaw = 0;
      t.pitch = 0.05;
      t.o = 1;
      k = 16;
      flight.x = p.x;
      flight.y = p.y;
      flight.wings = p.wings;
      flight.scale = p.scale;
      flight.visible = true;
    } else {
      // Editor, release, live: the chrome bat retires; the SVG mark takes over above the button.
      t.o = 0;
      k = 5;
    }

    if (snap) {
      Object.assign(c, t);
    } else {
      const a = 1 - Math.exp(-dt * k);
      const aw = 1 - Math.exp(-dt * (k * 0.8));
      c.x += (t.x - c.x) * a;
      c.y += (t.y - c.y) * a;
      c.z += (t.z - c.z) * a;
      c.s += (t.s - c.s) * a;
      c.roll += (t.roll - c.roll) * a;
      c.yaw += (t.yaw - c.yaw) * a;
      c.pitch += (t.pitch - c.pitch) * a;
      c.wings += (t.wings - c.wings) * aw;
      c.o += (t.o - c.o) * a;
    }

    g.position.set(c.x, c.y, c.z);
    g.scale.setScalar(Math.max(0.001, c.s));
    g.rotation.set(c.pitch, c.yaw, c.roll);
    const fold = (1 - clamp01(c.wings)) * 1.25;
    if (wingR.current) wingR.current.rotation.y = -fold;
    if (wingL.current) wingL.current.rotation.y = fold;
    g.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) m.opacity = c.o;
    });
    g.visible = c.o > 0.004;

    if (s.stage === "hero") {
      const [sx, sy] = toScreen(c.x, c.y);
      flight.x = sx;
      flight.y = sy;
      flight.wings = c.wings;
      flight.scale = 1;
      flight.visible = c.o > 0.05;
    }
  });

  const chrome = {
    color: "#ffffff",
    metalness: 1,
    roughness: quality === "high" ? 0.2 : 0.26,
    clearcoat: quality === "high" ? 1 : 0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.0,
    transparent: true,
    opacity: 0,
  } as const;

  return (
    <group ref={group}>
      <mesh geometry={geo.body}>
        <meshPhysicalMaterial {...chrome} />
      </mesh>
      <group ref={wingR} position={geo.hingeR}>
        <mesh geometry={geo.wingR}>
          <meshPhysicalMaterial {...chrome} />
        </mesh>
      </group>
      <group ref={wingL} position={geo.hingeL}>
        <mesh geometry={geo.wingL}>
          <meshPhysicalMaterial {...chrome} />
        </mesh>
      </group>
    </group>
  );
}

/** Dev only: lets a console peek at the scene (window.__vamp3d). */
function DevHook() {
  const scene = useThree((st) => st.scene);
  const gl = useThree((st) => st.gl);
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") (window as unknown as { __vamp3d?: unknown }).__vamp3d = { scene, gl };
  }, [scene, gl]);
  return null;
}

/** A studio for chrome: bright above and below, dark at the horizon, blood at the sides. */
/** Horizontal strips behind the camera: [elevation in world units at z = 9, intensity, colour, height]. */
const STRIPS: Array<[number, number, string, number]> = [
  [0.55, 1.6, "#ffffff", 0.7],
  [1.5, 0.9, "#f4f5f7", 1.0],
  [2.9, 0.5, "#d9dce2", 1.4],
  [4.8, 0.25, "#aeb3bb", 2.0],
  [-0.6, 0.12, "#6a6e75", 0.6],
  [-1.6, 0.35, "#c9ccd1", 1.0],
  [-3.2, 0.65, "#ffffff", 1.6],
  [-5.4, 0.22, "#8b8f97", 2.0],
];

function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      {/*
        A flat plate facing the viewer reflects one direction: straight back
        past the camera. The studio therefore lives behind the camera, as a
        stack of horizontal strips — bright just above the horizon, fading up,
        a dark line at the horizon, a second bright band below — so the
        reflection sweeps like chrome as the bat tilts. Blood on the right.
      */}
      {STRIPS.map(([y, intensity, color, h], i) => (
        <Lightformer key={i} form="rect" intensity={intensity} color={color} position={[0, y, 9]} target={[0, 0, 0]} scale={[16, h, 1]} />
      ))}
      <Lightformer form="rect" intensity={1.4} color="#d3132a" position={[5.2, -0.6, 8.5]} target={[0, 0, 0]} scale={[1.2, 6, 1]} />
      <Lightformer form="rect" intensity={0.6} color="#8b0000" position={[-5.6, -2.2, 8]} target={[0, 0, 0]} scale={[1.4, 4, 1]} />
      {/* Above and below, for the bevels. */}
      <Lightformer form="rect" intensity={1.4} color="#ffffff" position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[14, 4, 1]} />
      <Lightformer form="rect" intensity={0.6} color="#cfd3da" position={[0, -7, 0]} rotation-x={-Math.PI / 2} scale={[14, 3, 1]} />
    </Environment>
  );
}

/**
 * The one WebGL canvas of the site. Fixed behind the page; in front of the
 * black intro overlay while the intro plays. Unmounts once the editor is
 * open so nothing renders behind the form.
 */
export default function BatScene() {
  const stage = useVamp((s) => s.stage);
  const coarse = useLightweight();
  const reduced = usePrefersReducedMotion();
  const wanted = stage === "intro" || stage === "hero" || stage === "extracting";
  const [mounted, setMounted] = useState(wanted);
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    if (wanted) {
      const id = window.setTimeout(() => setMounted(true), 0);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => setMounted(false), 800);
    return () => window.clearTimeout(id);
  }, [wanted]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      signals.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      signals.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 1.1);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (!mounted || reduced) return null;
  const running = wanted && !(pastHero && stage === "hero");
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 transition-opacity duration-700 ${stage === "intro" ? "z-[89]" : "z-[1]"} ${wanted ? "opacity-100" : "opacity-0"}`}
    >
      <Canvas
        dpr={coarse ? 1 : [1, 1.75]}
        frameloop={running ? "always" : "never"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance", stencil: false, depth: true }}
        camera={{ position: [0, 0, CAM_Z], fov: FOV, near: 0.1, far: 200 }}
        style={{ background: "transparent" }}
      >
        <Studio />
        <DevHook />
        <pointLight color="#ff2d3f" intensity={6} distance={12} position={[3.2, -1.2, 2.5]} />
        <pointLight color="#ffffff" intensity={3} distance={14} position={[-3, 2.5, 3]} />
        <Bat quality={coarse ? "low" : "high"} />
      </Canvas>
    </div>
  );
}
