"use client";
import dynamic from "next/dynamic";
import { NODE_COLORS, type NodeType } from "@/lib/graph";
import type { GraphProps } from "./ForceGraphInner";
import type { Graph3DProps } from "./ForceGraph3DInner";

const loading = () => <div className="glass h-full w-full animate-pulse rounded-2xl" />;
const Inner = dynamic(() => import("./ForceGraphInner"), { ssr: false, loading });
const Inner3D = dynamic(() => import("./ForceGraph3DInner"), { ssr: false, loading });

/** Lightweight 2D canvas graph (used inside Capture, where nodes pop in live). */
export function KnowledgeGraph(props: GraphProps) {
  return (
    <div style={{ minHeight: props.height }}>
      <Inner {...props} />
    </div>
  );
}

/** Full 3D graph with layered layout, hover focus and fly-to (the Graph page). */
export function KnowledgeGraph3D(props: Graph3DProps) {
  return (
    <div style={{ minHeight: props.height }}>
      <Inner3D {...props} />
    </div>
  );
}

const LEGEND: { type: NodeType; label: string }[] = [
  { type: "machine", label: "Machine" },
  { type: "fault", label: "Fault code" },
  { type: "symptom", label: "Symptom" },
  { type: "cause", label: "Cause" },
  { type: "fix", label: "Fix" },
  { type: "tool", label: "Tool" },
  { type: "expert", label: "Expert" },
];

export function GraphLegend({ className }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted ${className ?? ""}`}>
      {LEGEND.map((l) => (
        <span key={l.type} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: NODE_COLORS[l.type], boxShadow: `0 0 8px ${NODE_COLORS[l.type]}88` }} />
          {l.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full border border-dashed border-bad bg-bad/10" />
        Knowledge gap
      </span>
    </div>
  );
}
