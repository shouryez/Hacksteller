"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { MotionValue } from "framer-motion";
import { NODE_COLORS, type NodeType } from "@/lib/graph";

/**
 * Hero 3D scene: a knowledge constellation. Machines sit at the core; faults, symptoms, causes,
 * fixes and tools orbit in shells, linked to the shell inside them. A few faults are hollow red
 * "gaps". The whole thing drifts, follows the cursor, and tilts/zooms with scroll progress.
 */
export function Constellation({ progress, className }: { progress?: MotionValue<number>; className?: string }) {
  return (
    <div className={className} aria-hidden>
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position: [0, 0, 12.5], fov: 45 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[6, 8, 10]} intensity={40} color="#ffb347" />
        <pointLight position={[-8, -6, 6]} intensity={20} color="#38bdf8" />
        <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.6}>
          <Scene progress={progress} />
        </Float>
        <Sparkles count={120} scale={[26, 16, 10]} size={1.6} speed={0.25} opacity={0.35} color="#ffd9b8" />
      </Canvas>
    </div>
  );
}

type Layer = { type: NodeType; count: number; radius: number; size: number };
const LAYERS: Layer[] = [
  { type: "fault", count: 18, radius: 3.1, size: 0.34 },
  { type: "symptom", count: 26, radius: 4.4, size: 0.26 },
  { type: "cause", count: 30, radius: 5.5, size: 0.24 },
  { type: "fix", count: 34, radius: 6.6, size: 0.26 },
  { type: "tool", count: 28, radius: 7.7, size: 0.18 },
];
const MACHINES = 4;

// Deterministic PRNG so the scene is identical on every load.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function fibonacciSphere(i: number, n: number, r: number, jitter: number, rand: () => number) {
  const phi = Math.acos(1 - (2 * (i + 0.5)) / n);
  const theta = Math.PI * (1 + Math.sqrt(5)) * i;
  const j = () => (rand() - 0.5) * jitter;
  return new THREE.Vector3(r * Math.sin(phi) * Math.cos(theta) + j(), r * Math.cos(phi) * 0.75 + j(), r * Math.sin(phi) * Math.sin(theta) + j());
}

function buildScene() {
  const rand = rng(1337);
  const machines: THREE.Vector3[] = [];
  for (let i = 0; i < MACHINES; i++) machines.push(fibonacciSphere(i, MACHINES, 1.3, 0.4, rand));

  const shells: { type: NodeType; positions: Float32Array; size: number; gaps: THREE.Vector3[] }[] = [];
  const linkPos: number[] = [];
  const linkCol: number[] = [];
  let prev = machines;
  const dim = new THREE.Color("#5b6b80");
  for (const layer of LAYERS) {
    const pts: THREE.Vector3[] = [];
    const gaps: THREE.Vector3[] = [];
    const col = new THREE.Color(NODE_COLORS[layer.type]);
    for (let i = 0; i < layer.count; i++) {
      const p = fibonacciSphere(i, layer.count, layer.radius, 0.9, rand);
      pts.push(p);
      const isGap = layer.type === "fault" && rand() < 0.3;
      if (isGap) gaps.push(p);
      // Link to the nearest one or two nodes of the inner shell.
      const near = [...prev].sort((a, b) => a.distanceToSquared(p) - b.distanceToSquared(p)).slice(0, rand() < 0.35 ? 2 : 1);
      for (const q of near) {
        linkPos.push(p.x, p.y, p.z, q.x, q.y, q.z);
        const c = isGap ? new THREE.Color("#ef4444") : col.clone().lerp(dim, 0.55);
        linkCol.push(c.r, c.g, c.b, dim.r, dim.g, dim.b);
      }
    }
    const positions = new Float32Array(pts.flatMap((p) => [p.x, p.y, p.z]));
    shells.push({ type: layer.type, positions, size: layer.size, gaps });
    prev = pts;
  }
  return { machines, shells, linkPos: new Float32Array(linkPos), linkCol: new Float32Array(linkCol) };
}

/** Soft round sprite with a bright core, drawn once on a canvas. */
function useGlowTexture() {
  return useMemo(() => {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.9)");
    g.addColorStop(0.5, "rgba(255,255,255,0.25)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function Scene({ progress }: { progress?: MotionValue<number> }) {
  const group = useRef<THREE.Group>(null);
  const gapGroup = useRef<THREE.Group>(null);
  const data = useMemo(buildScene, []);
  const glow = useGlowTexture();
  const pointer = useThree((s) => s.pointer);
  const materials = useRef<THREE.Material[]>([]);
  const t0 = useRef<number | null>(null);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    if (t0.current === null) t0.current = t;
    const life = Math.min(1, (t - t0.current) / 1.6);
    const p = progress?.get() ?? 0;

    // Fade everything in on mount.
    for (const m of materials.current) m.opacity = life * ("userData" in m && m.userData.base !== undefined ? m.userData.base : 1);

    // Slow drift + cursor parallax + scroll tilt/zoom.
    g.rotation.y += dt * 0.05;
    const targetX = pointer.y * -0.25 + p * 0.9;
    const targetZ = pointer.x * 0.12;
    g.rotation.x += (targetX - g.rotation.x) * 0.04;
    g.rotation.z += (targetZ - g.rotation.z) * 0.04;
    const s = (0.9 + life * 0.1) * (1 + p * 0.55);
    g.scale.setScalar(s);
    g.position.y = p * 3.2;

    // Gaps pulse.
    if (gapGroup.current) {
      const k = 1 + Math.sin(t * 2.4) * 0.18;
      gapGroup.current.children.forEach((c, i) => c.scale.setScalar(k * (1 + (i % 3) * 0.08)));
    }
  });

  const register = (m: THREE.Material | null, base = 1) => {
    if (m && !materials.current.includes(m)) {
      m.userData.base = base;
      m.transparent = true;
      m.opacity = 0;
      materials.current.push(m);
    }
  };

  return (
    <group ref={group} rotation={[0.35, 0, 0]}>
      {/* Links */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[data.linkPos, 3]} />
          <bufferAttribute attach="attributes-color" args={[data.linkCol, 3]} />
        </bufferGeometry>
        <lineBasicMaterial ref={(m) => register(m, 0.5)} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </lineSegments>

      {/* Shell nodes */}
      {data.shells.map((shell) => (
        <points key={shell.type}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[shell.positions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            ref={(m) => register(m, 0.95)}
            map={glow}
            color={NODE_COLORS[shell.type]}
            size={shell.size}
            sizeAttenuation
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      ))}

      {/* Gap faults: hollow red rings */}
      <group ref={gapGroup}>
        {data.shells[0].gaps.map((p, i) => (
          <mesh key={i} position={p}>
            <ringGeometry args={[0.16, 0.22, 24]} />
            <meshBasicMaterial ref={(m) => register(m, 0.9)} color="#ef4444" side={THREE.DoubleSide} transparent depthWrite={false} />
          </mesh>
        ))}
      </group>

      {/* Machines at the core */}
      {data.machines.map((p, i) => (
        <group key={i} position={p}>
          <mesh>
            <icosahedronGeometry args={[0.42, 1]} />
            <meshStandardMaterial ref={(m) => register(m, 1)} color="#cbd5e1" emissive="#ff7a1a" emissiveIntensity={0.35} wireframe transparent />
          </mesh>
          <sprite scale={[1.6, 1.6, 1]}>
            <spriteMaterial ref={(m) => register(m, 0.55)} map={glow} color="#ff7a1a" transparent depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      ))}

      {/* Faint orbit rings for depth */}
      {[3.1, 5.5, 7.7].map((r, i) => (
        <mesh key={r} rotation={[Math.PI / 2 + i * 0.15, 0, i * 0.4]}>
          <torusGeometry args={[r, 0.006, 8, 160]} />
          <meshBasicMaterial ref={(m) => register(m, 0.22)} color="#8d98a8" transparent depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
