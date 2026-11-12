"use client";
import ForceGraph2D, { type ForceGraphMethods, type NodeObject, type LinkObject } from "react-force-graph-2d";
import { useEffect, useMemo, useRef, useState } from "react";
import { NODE_COLORS, type GLink, type GNode } from "@/lib/graph";

type N = GNode & { x?: number; y?: number; bornAt?: number };
type FGNode = NodeObject<N>;
type FGLink = LinkObject<N, { type: string; fresh?: boolean }>;

const RADIUS: Record<GNode["type"], number> = { machine: 8, fault: 6.5, expert: 7.5, fix: 5.5, cause: 4.8, symptom: 4.8, tool: 3.6 };

export type GraphProps = {
  graph: { nodes: GNode[]; links: GLink[] };
  height: number;
  highlightIds?: Set<string>;
  machineFilter?: string;
  onNodeClick?: (n: GNode) => void;
  revealDelayMs?: number;
};

export default function ForceGraphInner({ graph, height, highlightIds, machineFilter, onNodeClick, revealDelayMs = 160 }: GraphProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods<FGNode, FGLink> | undefined>(undefined);
  const [width, setWidth] = useState(600);
  const objs = useRef(new Map<string, N>());
  const known = useRef<Set<string> | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
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

  // Reveal new nodes one at a time; the first render shows everything at once.
  useEffect(() => {
    const ids = filtered.nodes.map((n) => n.id);
    for (const n of filtered.nodes) {
      const o = objs.current.get(n.id);
      if (o) Object.assign(o, n);
      else objs.current.set(n.id, { ...n });
    }
    if (known.current === null) {
      known.current = new Set(ids);
      setRevealed(new Set(ids));
      return;
    }
    const fresh = ids.filter((id) => !known.current!.has(id));
    fresh.forEach((id) => known.current!.add(id));
    // Nodes that left the filter are hidden immediately.
    setRevealed((prev) => new Set([...prev].filter((id) => ids.includes(id) && !fresh.includes(id))));
    const toShow = ids.filter((id) => !fresh.includes(id));
    setRevealed((prev) => new Set([...prev, ...toShow]));
    const timers = fresh.map((id, i) =>
      setTimeout(() => {
        const o = objs.current.get(id);
        if (o) {
          o.bornAt = performance.now();
          const parentLink = filtered.links.find((l) => l.target === id) ?? filtered.links.find((l) => l.source === id);
          const parentId = parentLink ? (parentLink.target === id ? parentLink.source : parentLink.target) : undefined;
          const parent = parentId ? objs.current.get(parentId) : undefined;
          if (parent?.x !== undefined && o.x === undefined) {
            o.x = parent.x + (Math.random() - 0.5) * 12;
            o.y = (parent.y ?? 0) + (Math.random() - 0.5) * 12;
          }
        }
        setRevealed((prev) => new Set([...prev, id]));
      }, (i + 1) * revealDelayMs),
    );
    return () => timers.forEach(clearTimeout);
  }, [filtered, revealDelayMs]);

  const data = useMemo(() => {
    const nodes = filtered.nodes.filter((n) => revealed.has(n.id)).map((n) => objs.current.get(n.id)!) as FGNode[];
    const now = performance.now();
    const links = filtered.links
      .filter((l) => revealed.has(l.source) && revealed.has(l.target))
      .map((l) => {
        const t = objs.current.get(l.target);
        return { source: l.source, target: l.target, type: l.type, fresh: t?.bornAt !== undefined && now - t.bornAt < 4000 };
      }) as FGLink[];
    return { nodes, links };
  }, [filtered, revealed]);

  useEffect(() => {
    fgRef.current?.d3Force("charge")?.strength(-55);
    fgRef.current?.d3Force("link")?.distance(28);
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full overflow-hidden rounded-xl border border-line bg-[#07090c]" style={{ height }}>
      <ForceGraph2D<N, { type: string; fresh?: boolean }>
        ref={fgRef}
        width={width}
        height={height}
        graphData={data}
        backgroundColor="rgba(0,0,0,0)"
        autoPauseRedraw={false}
        cooldownTicks={120}
        onEngineStop={() => {
          if (!fitted.current) {
            fitted.current = true;
            fgRef.current?.zoomToFit(500, 30);
          }
        }}
        linkColor={(l) => ((l as FGLink).fresh ? "rgba(255,122,26,0.7)" : "rgba(120,135,155,0.28)")}
        linkWidth={(l) => ((l as FGLink).fresh ? 1.6 : 0.8)}
        linkDirectionalParticles={(l) => ((l as FGLink).fresh ? 3 : 0)}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleColor={() => "#ff7a1a"}
        nodeLabel={(n) => `${(n as N).type.toUpperCase()}: ${(n as N).label}`}
        onNodeClick={(n) => onNodeClick?.(n as N)}
        nodePointerAreaPaint={(n, color, ctx) => {
          const node = n as N;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(node.x ?? 0, node.y ?? 0, RADIUS[node.type] + 3, 0, 2 * Math.PI);
          ctx.fill();
        }}
        nodeCanvasObject={(n, ctx, scale) => {
          const node = n as N;
          const x = node.x ?? 0;
          const y = node.y ?? 0;
          const age = node.bornAt ? performance.now() - node.bornAt : Infinity;
          const pop = age < 450 ? easeOutBack(age / 450) : 1;
          const glow = age < 4000 ? 1 - age / 4000 : 0;
          const hl = highlightIds?.has(node.id);
          const r = RADIUS[node.type] * pop;
          const color = node.type === "fault" && node.gap ? "#ef4444" : NODE_COLORS[node.type];
          ctx.save();
          if (glow > 0 || hl) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 28 * Math.max(glow, hl ? 0.7 : 0);
          }
          ctx.beginPath();
          ctx.arc(x, y, Math.max(0.1, r), 0, 2 * Math.PI);
          if (node.type === "fault" && node.gap) {
            ctx.fillStyle = "rgba(239,68,68,0.12)";
            ctx.fill();
            ctx.setLineDash([2, 1.5]);
            ctx.lineWidth = 1.4;
            ctx.strokeStyle = color;
            ctx.stroke();
          } else {
            ctx.fillStyle = color;
            ctx.fill();
          }
          if (hl) {
            ctx.setLineDash([]);
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "#fff";
            ctx.stroke();
          }
          ctx.restore();
          const showLabel = scale > 2.2 || node.type === "machine" || node.type === "expert" || node.type === "fault" || glow > 0 || hl;
          if (showLabel) {
            const fontSize = Math.max(2.5, 11 / scale);
            ctx.font = `${node.type === "machine" ? 600 : 400} ${fontSize}px Inter, system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = glow > 0 ? "#ffffff" : node.type === "fault" && node.gap ? "#fca5a5" : "rgba(230,237,243,0.82)";
            const text = node.label.length > 34 ? node.label.slice(0, 33) + "…" : node.label;
            ctx.fillText(text, x, y + r + 1.5);
          }
        }}
      />
    </div>
  );
}

function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
