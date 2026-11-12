"use client";
import dynamic from "next/dynamic";
import { NODE_COLORS, type NodeType } from "@/lib/graph";
import type { GraphProps } from "./ForceGraphInner";

const Inner = dynamic(() => import("./ForceGraphInner"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-xl border border-line bg-panel" />,
});

export function KnowledgeGraph(props: GraphProps) {
  return (
    <div style={{ minHeight: props.height }}>
      <Inner {...props} />
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

export function GraphLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
      {LEGEND.map((l) => (
        <span key={l.type} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: NODE_COLORS[l.type] }} />
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
