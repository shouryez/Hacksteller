"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Boxes, Layers, Mic, Orbit, Search, X } from "lucide-react";
import { GraphLegend, KnowledgeGraph, KnowledgeGraph3D } from "@/components/KnowledgeGraph";
import { AudioClip } from "@/components/AudioClip";
import { Badge, Button, Card, Chip, Eyebrow, Input, PageHeader, cn } from "@/components/ui";
import { buildGraph, NODE_COLORS, type GNode } from "@/lib/graph";
import { useRecords } from "@/hooks/useRecords";
import { machinesFor } from "@/lib/records";
import { expertById, machineById } from "@/lib/seed";
import { useStore } from "@/lib/store";

const TYPE_LABEL: Record<GNode["type"], string> = { machine: "Machine", fault: "Fault code", symptom: "Symptom", cause: "Cause", fix: "Fix", tool: "Tool", expert: "Expert" };

export default function GraphPage() {
  const stories = useStore((s) => s.stories);
  const records = useRecords();
  const graph = useMemo(() => buildGraph(stories, records), [stories, records]);
  const [filter, setFilter] = useState<string | undefined>();
  const [selected, setSelected] = useState<GNode | null>(null);
  const [mode, setMode] = useState<"3d" | "2d">("3d");
  const [layered, setLayered] = useState(true);
  const [q, setQ] = useState("");
  const focusRef = useRef<((id: string) => void) | null>(null);

  const linked = selected ? stories.filter((s) => selected.storyIds.includes(s.id)) : [];
  const counts = useMemo(() => {
    const c: Partial<Record<GNode["type"], number>> = {};
    for (const n of graph.nodes) c[n.type] = (c[n.type] ?? 0) + 1;
    return c;
  }, [graph]);
  const gaps = graph.nodes.filter((n) => n.type === "fault" && n.gap).length;
  const matches = q.trim() ? graph.nodes.filter((n) => n.label.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 6) : [];

  function pick(n: GNode) {
    setSelected(n);
    setQ("");
    focusRef.current?.(n.id);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Knowledge graph"
        title={
          <>
            How the factory&apos;s repair knowledge <span className="text-accent">connects</span>.
          </>
        }
        description={`${graph.nodes.length} nodes from ${stories.length} recordings. Machines sit at the centre; faults, symptoms, causes, fixes and tools fan out in layers. Hover to focus, click to fly in.`}
        actions={
          <>
            <div className="glass flex items-center gap-1 rounded-xl p-1">
              <ModeBtn active={mode === "3d"} onClick={() => setMode("3d")} icon={Boxes} label="3D" />
              <ModeBtn active={mode === "2d"} onClick={() => setMode("2d")} icon={Orbit} label="2D" />
            </div>
            {mode === "3d" && (
              <div className="glass flex items-center gap-1 rounded-xl p-1">
                <ModeBtn active={layered} onClick={() => setLayered(true)} icon={Layers} label="Layered" />
                <ModeBtn active={!layered} onClick={() => setLayered(false)} icon={Orbit} label="Organic" />
              </div>
            )}
          </>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="relative">
          <div className="glass-strong overflow-hidden rounded-2xl p-1.5">
            {mode === "3d" ? (
              <KnowledgeGraph3D graph={graph} height={680} machineFilter={filter} layered={layered} selectedId={selected?.id} onNodeClick={setSelected} focusRef={focusRef} />
            ) : (
              <KnowledgeGraph graph={graph} height={680} machineFilter={filter} onNodeClick={setSelected} highlightIds={selected ? new Set([selected.id]) : undefined} />
            )}
          </div>

          {/* Floating controls */}
          <div className="pointer-events-none absolute inset-x-4 top-4 flex flex-wrap items-start justify-between gap-2">
            <div className="pointer-events-auto flex flex-wrap gap-1.5">
              {[undefined, ...machinesFor(records).map((m) => m.id)].map((id) => (
                <Chip key={id ?? "all"} active={filter === id} onClick={() => setFilter(id)} className="glass-strong h-8">
                  {id ?? "All machines"}
                </Chip>
              ))}
            </div>
            <div className="pointer-events-auto relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a node…" className="glass-strong h-9 pl-9 text-xs" />
              <AnimatePresence>
                {matches.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass-strong absolute left-0 right-0 top-11 z-10 overflow-hidden rounded-xl p-1">
                    {matches.map((m) => (
                      <button key={m.id} onClick={() => pick(m)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs hover:bg-white/5">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: NODE_COLORS[m.type] }} />
                        <span className="truncate">{m.label}</span>
                        <span className="ml-auto shrink-0 text-muted">{TYPE_LABEL[m.type]}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-x-4 bottom-4 flex flex-wrap items-end justify-between gap-2">
            <GraphLegend className="pointer-events-auto glass-strong rounded-xl px-3 py-2" />
            <div className="pointer-events-auto glass-strong rounded-xl px-3 py-2 text-xs text-muted">
              {counts.fault ?? 0} faults · <span className="text-bad">{gaps} gaps</span> · {counts.fix ?? 0} fixes · {counts.tool ?? 0} tools
            </div>
          </div>
        </div>

        {/* Detail panel */}
        <AnimatePresence mode="wait">
          <motion.div key={selected?.id ?? "none"} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.25 }}>
            <Card className="space-y-4 lg:sticky lg:top-24">
              {selected ? (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                        <span className="h-2 w-2 rounded-full" style={{ background: selected.gap ? "#ef4444" : NODE_COLORS[selected.type] }} />
                        {TYPE_LABEL[selected.type]}
                        {selected.machineId && <> · {machineById(selected.machineId)?.name ?? selected.machineId}</>}
                      </span>
                      <div className="mt-1.5 text-xl font-semibold leading-snug">{selected.label}</div>
                    </div>
                    <button onClick={() => setSelected(null)} className="text-muted hover:text-text" aria-label="Clear selection">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {selected.gap && (
                    <div className="rounded-xl border border-bad/40 bg-bad/10 p-3 text-sm">
                      <div className="font-medium text-bad">No captured fix for this fault yet.</div>
                      <Link href={`/interview?code=${selected.label.split(" ")[0]}`} className="mt-2 inline-block">
                        <Button size="sm" variant="primary">
                          <Mic className="h-4 w-4" /> Interview Raju about it
                        </Button>
                      </Link>
                    </div>
                  )}
                  <div>
                    <Eyebrow>Sources ({linked.length})</Eyebrow>
                    <div className="mt-2 space-y-2">
                      {linked.length === 0 && <p className="text-sm text-muted">Derived from the fault log, not from a recording.</p>}
                      {linked.map((s) => (
                        <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <div className="text-sm font-medium">{s.extraction.title}</div>
                          <div className="mb-2 text-xs text-muted">{expertById(s.expertId)?.name}</div>
                          <div className="flex flex-wrap items-center gap-2">
                            <AudioClip story={s} />
                            {s.extraction.faultCodes[0] && (
                              <Link href={`/guides/${s.extraction.faultCodes[0]}`}>
                                <Badge tone="accent">Guide {s.extraction.faultCodes[0]}</Badge>
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <Eyebrow>Reading the graph</Eyebrow>
                  <ul className="space-y-2 text-sm text-muted">
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#cbd5e1]" /> Machines are the hubs in the middle.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" /> Fault codes orbit their machine. <span className="text-bad">Red rings</span> are faults nobody has explained.
                    </li>
                    <li className="flex gap-2">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ok" /> Each layer out: symptom → cause → fix → tool. Follow a path and you have the repair.
                    </li>
                  </ul>
                  <p className="text-xs text-muted">Drag to orbit, scroll to zoom. Hover any node to see only its neighbours; click to fly to it.</p>
                </>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function ModeBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Boxes; label: string }) {
  return (
    <button onClick={onClick} className={cn("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors", active ? "bg-accent/15 text-accent" : "text-muted hover:text-text")} aria-pressed={active}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}
