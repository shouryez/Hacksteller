"use client";
import { useMemo, useState } from "react";
import { GraphLegend, KnowledgeGraph } from "@/components/KnowledgeGraph";
import { AudioClip } from "@/components/AudioClip";
import { Badge, Card, Eyebrow, cn } from "@/components/ui";
import { buildGraph, type GNode } from "@/lib/graph";
import { MACHINES, expertById } from "@/lib/seed";
import { useStore } from "@/lib/store";

export default function GraphPage() {
  const stories = useStore((s) => s.stories);
  const graph = useMemo(() => buildGraph(stories), [stories]);
  const [filter, setFilter] = useState<string | undefined>();
  const [selected, setSelected] = useState<GNode | null>(null);
  const linked = selected ? stories.filter((s) => selected.storyIds.includes(s.id)) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Knowledge graph</Eyebrow>
          <h1 className="mt-1 text-2xl font-semibold">How the factory&apos;s repair knowledge connects</h1>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[undefined, ...MACHINES.map((m) => m.id)].map((id) => (
            <button
              key={id ?? "all"}
              onClick={() => setFilter(id)}
              className={cn("rounded-full border px-3 py-1 text-xs", filter === id ? "border-accent bg-accent/10 text-accent" : "border-line text-muted hover:text-text")}
            >
              {id ?? "All machines"}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-2">
          <KnowledgeGraph graph={graph} height={640} machineFilter={filter} onNodeClick={setSelected} highlightIds={selected ? new Set([selected.id]) : undefined} />
          <GraphLegend />
        </div>
        <Card className="space-y-3 lg:self-start">
          {selected ? (
            <>
              <Badge tone="accent">{selected.type}</Badge>
              <div className="text-lg font-semibold">{selected.label}</div>
              {selected.gap && <p className="text-sm text-bad">No captured fix for this fault yet.</p>}
              <Eyebrow>Stories ({linked.length})</Eyebrow>
              {linked.map((s) => (
                <div key={s.id} className="rounded-lg border border-line bg-panel2 p-3">
                  <div className="text-sm font-medium">{s.extraction.title}</div>
                  <div className="mb-2 text-xs text-muted">{expertById(s.expertId)?.name}</div>
                  <AudioClip story={s} />
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-muted">Click a node to see which recordings it came from. Dashed red rings are faults nobody has explained yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
