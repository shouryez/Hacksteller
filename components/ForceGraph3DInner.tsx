"use client";
import ForceGraph3D, { type ForceGraphMethods, type NodeObject, type LinkObject } from "react-force-graph-3d";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { NODE_COLORS, type GLink, type GNode } from "@/lib/graph";

type N = GNode & { x?: number; y?: number; z?: number; vx?: number; vy?: number; vz?: number; fx?: number; fy?: number; fz?: number };
type FGNode = NodeObject<N>;
type FGLink = LinkObject<N, { type: string }>;

const RADIUS: Record<GNode["type"], number> = { machine: 7, fault: 5, expert: 6, fix: 4.2, cause: 3.6, symptom: 3.6, tool: 2.6 };
/** Which node types always show their label; the rest appear on hover/selection. */
const ALWAYS_LABEL = new Set<GNode["type"]>(["machine", "fault"]);

/**
 * Layered layout: machines are pinned on a small ring, and every other type is pulled onto its own
 * spherical shell (fault → symptom → cause → fix → tool), so reading outward follows the repair.
 * Links keep each branch in its machine's sector.
 */
const SHELL: Record<GNode["type"], number> = { machine: 0, fault: 120, symptom: 175, expert: 210, cause: 225, fix: 275, tool: 320 };
const MACHINE_RING = 72;

function shellForce(strength = 0.35) {
  let nodes: N[] = [];
  const force = (alpha: number) => {
    for (const n of nodes) {
      if (n.type === "machine" || n.x === undefined) continue;
      const x = n.x,
        y = n.y ?? 0,
        z = n.z ?? 0;
      const r = Math.hypot(x, y, z) || 1;
      const k = ((SHELL[n.type] - r) / r) * alpha * strength;
      n.vx = (n.vx ?? 0) + x * k;
      n.vy = (n.vy ?? 0) + y * k;
      n.vz = (n.vz ?? 0) + z * k;
    }
  };
  force.initialize = (ns: N[]) => {
    nodes = ns;
  };
  return force;
}

export type Graph3DProps = {
  graph: { nodes: GNode[]; links: GLink[] };
  height: number;
  machineFilter?: string;
  selectedId?: string | null;
  layered?: boolean;
  onNodeClick?: (n: GNode) => void;
  /** Ref-like hook so the page can ask the graph to fly to a node id. */
  focusRef?: React.MutableRefObject<((id: string) => void) | null>;
};

type Built = { group: THREE.Group; mats: THREE.Material[]; label: THREE.Sprite; sphere: THREE.Mesh; halo: THREE.Sprite };

export default function ForceGraph3DInner({ graph, height, machineFilter, selectedId, layered = true, onNodeClick, focusRef }: Graph3DProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods<FGNode, FGLink> | undefined>(undefined);
  const [width, setWidth] = useState(800);
  const [hover, setHover] = useState<string | null>(null);
  const built = useRef(new Map<string, Built>());
  const bloomed = useRef(false);
  const fitted = useRef(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Filter by machine (keeps experts/tools connected to kept nodes).
  const filtered = useMemo(() => {
    if (!machineFilter) return graph;
    const keep = new Set(graph.nodes.filter((n) => n.machineId === machineFilter).map((n) => n.id));
    for (const l of graph.links) {
      if (keep.has(l.source) || keep.has(l.target)) {
        const other = keep.has(l.source) ? l.target : l.source;
        const node = graph.nodes.find((n) => n.id === other);
        if (node && !node.machineId) keep.add(other);
      }
    }
    return { nodes: graph.nodes.filter((n) => keep.has(n.id)), links: graph.links.filter((l) => keep.has(l.source) && keep.has(l.target)) };
  }, [graph, machineFilter]);

  // Stable node objects so the simulation keeps positions between renders.
  const objs = useRef(new Map<string, N>());
  const data = useMemo(() => {
    const nodes = filtered.nodes.map((n) => {
      const o = objs.current.get(n.id);
      if (o) return Object.assign(o, n);
      const fresh: N = { ...n };
      objs.current.set(n.id, fresh);
      return fresh;
    }) as FGNode[];
    const links = filtered.links.map((l) => ({ source: l.source, target: l.target, type: l.type })) as FGLink[];
    return { nodes, links };
  }, [filtered]);

  // Neighbourhood of the hovered/selected node, used to dim everything else.
  const focusId = hover ?? selectedId ?? null;
  const neighbours = useMemo(() => {
    if (!focusId) return null;
    const set = new Set<string>([focusId]);
    for (const l of filtered.links) {
      if (l.source === focusId) set.add(l.target);
      if (l.target === focusId) set.add(l.source);
    }
    return set;
  }, [focusId, filtered.links]);

  // Apply dimming/labels to the already-built three objects without rebuilding them.
  useEffect(() => {
    for (const [id, b] of built.current) {
      const node = objs.current.get(id);
      const inFocus = !neighbours || neighbours.has(id);
      const isFocus = id === focusId;
      const base = inFocus ? 1 : 0.12;
      b.mats.forEach((m) => (m.opacity = base));
      b.halo.material.opacity = base * 0.35;
      b.label.material.opacity = isFocus || (inFocus && (ALWAYS_LABEL.has(node?.type ?? "tool") || Boolean(neighbours))) ? 1 : 0;
      b.sphere.scale.setScalar(isFocus ? 1.35 : 1);
    }
  }, [neighbours, focusId]);

  const linkColor = useCallback(
    (l: FGLink) => {
      const s = typeof l.source === "object" ? (l.source as N).id : String(l.source);
      const t = typeof l.target === "object" ? (l.target as N).id : String(l.target);
      if (neighbours && !(neighbours.has(s) && neighbours.has(t))) return "rgba(120,135,155,0.05)";
      if (focusId && (s === focusId || t === focusId)) return "rgba(255,122,26,0.9)";
      return "rgba(140,155,175,0.35)";
    },
    [neighbours, focusId],
  );

  const flyTo = useCallback((id: string) => {
    const n = objs.current.get(id);
    const fg = fgRef.current;
    if (!n || !fg || n.x === undefined) return;
    const dist = 90;
    const r = Math.hypot(n.x, n.y ?? 0, n.z ?? 0) || 1;
    const k = 1 + dist / r;
    fg.cameraPosition({ x: n.x * k, y: (n.y ?? 0) * k, z: (n.z ?? 0) * k }, { x: n.x, y: n.y ?? 0, z: n.z ?? 0 }, 900);
  }, []);
  useEffect(() => {
    if (focusRef) focusRef.current = flyTo;
  }, [focusRef, flyTo]);

  // Forces: layered = pinned machine ring + type shells; organic = plain force layout.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force("charge")?.strength(layered ? -45 : -70);
    fg.d3Force("link")?.distance(layered ? 34 : 30);
    const machines = data.nodes.filter((n) => n.type === "machine") as N[];
    machines.forEach((m, i) => {
      const a = (i / Math.max(1, machines.length)) * Math.PI * 2;
      if (layered) {
        m.fx = Math.cos(a) * MACHINE_RING;
        m.fy = Math.sin(a) * MACHINE_RING;
        m.fz = 0;
      } else {
        m.fx = m.fy = m.fz = undefined;
      }
    });
    fg.d3Force("shell", layered ? (shellForce() as never) : null);
    fitted.current = false;
    fg.d3ReheatSimulation();
  }, [layered, data]);

  // Soft bloom, added once.
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || bloomed.current) return;
    bloomed.current = true;
    fg.postProcessingComposer().addPass(new UnrealBloomPass(new THREE.Vector2(width, height), 0.55, 0.4, 0.35));
  }, [width, height]);

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden rounded-2xl" style={{ height }}>
      <ForceGraph3D<N, { type: string }>
        ref={fgRef}
        width={width}
        height={height}
        graphData={data}
        backgroundColor="#07080b"
        showNavInfo={false}
        enableNodeDrag={false}
        cooldownTicks={160}
        warmupTicks={40}
        nodeLabel={() => ""}
        nodeThreeObject={(n) => buildNode(n as N, built.current)}
        nodeThreeObjectExtend={false}
        linkColor={(l) => linkColor(l as FGLink)}
        linkOpacity={0.9}
        linkWidth={(l) => {
          const s = typeof l.source === "object" ? (l.source as N).id : String(l.source);
          const t = typeof l.target === "object" ? (l.target as N).id : String(l.target);
          return focusId && (s === focusId || t === focusId) ? 1.2 : 0.4;
        }}
        linkDirectionalParticles={(l) => {
          const s = typeof l.source === "object" ? (l.source as N).id : String(l.source);
          const t = typeof l.target === "object" ? (l.target as N).id : String(l.target);
          return focusId && (s === focusId || t === focusId) ? 3 : 0;
        }}
        linkDirectionalParticleWidth={1.6}
        linkDirectionalParticleColor={() => "#ff7a1a"}
        onNodeHover={(n) => {
          setHover(n ? (n as N).id : null);
          if (wrapRef.current) wrapRef.current.style.cursor = n ? "pointer" : "grab";
        }}
        onNodeClick={(n) => {
          const node = n as N;
          flyTo(node.id);
          onNodeClick?.(node);
        }}
        onEngineStop={() => {
          // Fit once per layout; later stops must not undo a fly-to.
          if (fitted.current) return;
          fitted.current = true;
          fgRef.current?.zoomToFit(800, 40);
        }}
      />
    </div>
  );
}

/** Sphere (or hollow ring for gaps) + soft glow + a text label sprite. Cached per node id. */
function buildNode(node: N, cache: Map<string, Built>): THREE.Object3D {
  const cached = cache.get(node.id);
  if (cached) return cached.group;
  const color = node.type === "fault" && node.gap ? "#ef4444" : NODE_COLORS[node.type];
  const r = RADIUS[node.type];
  const group = new THREE.Group();
  const mats: THREE.Material[] = [];

  let sphere: THREE.Mesh;
  if (node.type === "fault" && node.gap) {
    const ring = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1, side: THREE.DoubleSide });
    sphere = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.16, 10, 36), ring);
    const core = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 16, 16), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15 }));
    mats.push(ring, core.material as THREE.Material);
    group.add(sphere, core);
  } else {
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: node.type === "machine" ? 0.35 : 0.5, roughness: 0.35, metalness: 0.2, transparent: true });
    sphere = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 24), mat);
    mats.push(mat);
    group.add(sphere);
  }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
  halo.scale.setScalar(r * 4.5);
  group.add(halo);

  const text = node.type === "fault" ? node.label.split(" ")[0] : node.type === "machine" ? node.label : shorten(node.label, 30);
  const label = textSprite(text, color);
  label.position.set(0, -(r + 5), 0);
  label.material.opacity = ALWAYS_LABEL.has(node.type) ? 1 : 0;
  group.add(label);

  cache.set(node.id, { group, mats, label, sphere, halo });
  return group;
}

let _glow: THREE.Texture | null = null;
function glowTexture() {
  if (_glow) return _glow;
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _glow = new THREE.CanvasTexture(c);
  return _glow;
}

function textSprite(text: string, color: string): THREE.Sprite {
  const font = "500 26px Inter, system-ui, sans-serif";
  const pad = 14;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d")!;
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = 44;
  c.width = w * 2;
  c.height = h * 2;
  ctx.scale(2, 2);
  ctx.font = font;
  // Pill background.
  ctx.fillStyle = "rgba(7,8,11,0.72)";
  roundRect(ctx, 0, 0, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1.5;
  roundRect(ctx, 0.75, 0.75, w - 1.5, h - 1.5, 12);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#eef2f7";
  ctx.textBaseline = "middle";
  ctx.fillText(text, pad, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const scale = 0.32;
  sprite.scale.set(w * scale, h * scale, 1);
  return sprite;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function shorten(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
