"use client";
import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Fuse from "fuse.js";
import { ChevronDown, Download, Search, Trash2, Upload } from "lucide-react";
import { AudioClip } from "@/components/AudioClip";
import { ExtractionCard } from "@/components/ExtractionCard";
import { Badge, Button, Card, Eyebrow, cn } from "@/components/ui";
import { deleteAudio } from "@/lib/audio";
import { EXPERTS, MACHINES, expertById, machineById } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { Story } from "@/lib/types";

const LANG_LABEL: Record<string, string> = { "en-IN": "English", "hi-IN": "Hindi", "kn-IN": "Kannada" };

export default function LibraryPage() {
  const stories = useStore((s) => s.stories);
  const removeStory = useStore((s) => s.removeStory);
  const importStories = useStore((s) => s.importStories);
  const [q, setQ] = useState("");
  const [machine, setMachine] = useState<string>("");
  const [expert, setExpert] = useState<string>("");
  const [open, setOpen] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const sorted = useMemo(() => [...stories].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [stories]);
  const fuse = useMemo(
    () =>
      new Fuse(sorted, {
        keys: ["extraction.title", "extraction.summary", "transcript", "extraction.faultCodes", "extraction.tribalTips.text", "extraction.fixes.label"],
        threshold: 0.38,
        ignoreLocation: true,
      }),
    [sorted],
  );
  const list = (q.trim() ? fuse.search(q).map((r) => r.item) : sorted).filter(
    (s) => (!machine || s.machineId === machine) && (!expert || s.expertId === expert),
  );

  const totals = useMemo(
    () => ({
      tips: stories.reduce((a, s) => a + s.extraction.tribalTips.length, 0),
      fixes: stories.reduce((a, s) => a + s.extraction.fixes.length, 0),
      codes: new Set(stories.flatMap((s) => s.extraction.faultCodes)).size,
    }),
    [stories],
  );

  function exportJson() {
    const blob = new Blob([JSON.stringify({ app: "ghostwrench", version: 1, exportedAt: new Date().toISOString(), stories }, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ghostwrench-knowledge-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Knowledge base exported", { description: `${stories.length} stories. Recorded audio stays on this device.` });
  }

  async function importJson(file: File) {
    try {
      const json = JSON.parse(await file.text());
      const incoming: Story[] = Array.isArray(json) ? json : json.stories;
      if (!Array.isArray(incoming) || !incoming.every(isStory)) throw new Error("Not a GhostWrench export");
      const added = importStories(incoming);
      toast(added ? `Imported ${added} stories` : "Nothing new to import", { tone: added ? "ok" : "info" });
    } catch (e) {
      toast("Import failed", { tone: "bad", description: e instanceof Error ? e.message : "Invalid file" });
    }
  }

  async function remove(s: Story) {
    if (!confirm(`Delete “${s.extraction.title}”? This removes it from guides and the graph.`)) return;
    removeStory(s.id);
    if (s.audioKey) await deleteAudio(s.audioKey);
    toast("Story deleted", { tone: "info", description: "Use Reset (↺) to restore the seed stories." });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow className="text-accent/90">Knowledge Vault</Eyebrow>
          <h1 className="mt-2 text-balance text-3xl font-semibold leading-[1.05] sm:text-4xl">Every recording, structured and searchable</h1>
          <p className="mt-2 text-muted">
            {stories.length} stories · {totals.fixes} fixes · {totals.tips} tribal tips · {totals.codes} fault codes
          </p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && void importJson(e.target.files[0])} />
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import
          </Button>
          <Button size="sm" variant="primary" onClick={exportJson}>
            <Download className="h-4 w-4" /> Export JSON
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search transcripts, fixes, tips…"
            className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        <Chips value={machine} onChange={setMachine} options={MACHINES.map((m) => ({ value: m.id, label: m.id }))} all="All machines" />
        <Chips value={expert} onChange={setExpert} options={EXPERTS.map((e) => ({ value: e.id, label: e.name.split(" ")[0] }))} all="All experts" />
      </div>

      <div className="space-y-2">
        {list.length === 0 && <Card className="text-sm text-muted">No stories match.</Card>}
        {list.map((s) => {
          const isOpen = open === s.id;
          return (
            <Card key={s.id} className="p-0">
              <div className="flex flex-wrap items-center gap-3 p-4">
                <button onClick={() => setOpen(isOpen ? null : s.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={isOpen}>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted transition-transform", isOpen && "rotate-180")} />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{s.extraction.title}</div>
                    <div className="text-xs text-muted">
                      {expertById(s.expertId)?.name} · {machineById(s.machineId)?.name} · {new Date(s.createdAt).toLocaleString()} · {LANG_LABEL[s.language]}
                    </div>
                  </div>
                </button>
                <div className="flex flex-wrap items-center gap-1.5">
                  {s.id.startsWith("seed-") && <Badge tone="neutral">seed</Badge>}
                  {s.interviewQuestion && <Badge tone="info">interview</Badge>}
                  {s.extraction.faultCodes.map((c) => (
                    <Badge key={c} tone="accent">
                      {c}
                    </Badge>
                  ))}
                  <AudioClip story={s} label="Play" />
                  <button onClick={() => void remove(s)} className="rounded-md p-2 text-muted hover:bg-bad/10 hover:text-bad" aria-label="Delete story">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="space-y-3 border-t border-white/10 p-4">
                      {s.interviewQuestion && <p className="text-sm text-muted">Answering: &ldquo;{s.interviewQuestion}&rdquo;</p>}
                      <div className="rounded-xl border border-white/10 bg-black/30 p-3 text-sm leading-relaxed">
                        <Eyebrow className="mb-1">Transcript</Eyebrow>
                        {s.transcript}
                      </div>
                      <ExtractionCard story={s} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Chips({ value, onChange, options, all }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; all: string }) {
  return (
    <div className="flex flex-wrap gap-1">
      {[{ value: "", label: all }, ...options].map((o) => (
        <button
          key={o.value || "all"}
          onClick={() => onChange(o.value)}
          className={cn("h-10 rounded-xl border px-3 text-xs", value === o.value ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted hover:text-text")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function isStory(x: unknown): x is Story {
  const s = x as Story;
  return Boolean(s && typeof s.id === "string" && typeof s.machineId === "string" && s.extraction && Array.isArray(s.extraction.fixes));
}
