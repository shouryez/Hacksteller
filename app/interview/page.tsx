"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, MessageCircleQuestion, Volume2 } from "lucide-react";
import { CaptureStudio } from "@/components/CaptureStudio";
import { Badge, Button, Card, Eyebrow, SourceBadge, cn } from "@/components/ui";
import { postJson } from "@/lib/client";
import { computeCoverage } from "@/lib/coverage";
import { offlineInterview } from "@/lib/offline";
import { hours, machineById } from "@/lib/seed";
import { useStore, type GapQuestion } from "@/lib/store";
import { useStatus } from "@/hooks/useStatus";
import { useSpeaker } from "@/hooks/useSpeaker";
import type { InterviewQuestion } from "@/lib/types";

type Item = { id: string; question: string; why: string; faultCode: string; machineId: string; origin: "gap" | "junior"; source?: string };

export default function InterviewPage() {
  return (
    <Suspense fallback={null}>
      <Interview />
    </Suspense>
  );
}

function Interview() {
  const params = useSearchParams();
  const status = useStatus();
  const stories = useStore((s) => s.stories);
  const queue = useStore((s) => s.queue);
  const dequeue = useStore((s) => s.dequeue);
  const gapQuestions = useStore((s) => s.gapQuestions);
  const setGapQuestions = useStore((s) => s.setGapQuestions);
  const demoMode = useStore((s) => s.demoMode);
  const hydrated = useStore((s) => s.hydrated);
  const speaker = useSpeaker(Boolean(status?.sarvam));
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);

  const cov = useMemo(() => computeCoverage(stories), [stories]);
  const fallback = useMemo(() => offlineInterview(cov.gaps, []).questions, [cov.gaps]);

  const items: Item[] = useMemo(() => {
    const junior: Item[] = queue.map((q) => ({ ...q, origin: "junior" as const }));
    const gaps: Item[] = cov.gaps.map((g) => {
      const gq = gapQuestions[g.faultCode];
      const fb = fallback.find((f) => f.faultCode === g.faultCode);
      return {
        id: `gap:${g.faultCode}`,
        question: gq?.question ?? fb?.question ?? "",
        why: gq?.why ?? fb?.why ?? "",
        faultCode: g.faultCode,
        machineId: g.machineId,
        origin: "gap" as const,
        source: gq?.source,
      };
    });
    return [...junior, ...gaps];
  }, [queue, cov.gaps, gapQuestions, fallback]);

  // Ask Claude once for better-worded questions about gaps we haven't phrased yet.
  const missing = cov.gaps.filter((g) => !gapQuestions[g.faultCode]).map((g) => g.faultCode).join(",");
  useEffect(() => {
    if (!hydrated || !missing || !status) return;
    const gaps = cov.gaps.filter((g) => missing.split(",").includes(g.faultCode));
    setLoading(true);
    postJson<{ questions: InterviewQuestion[] }>("/api/interview", { gaps, junior: [], demo: demoMode })
      .then((res) => {
        const map: Record<string, GapQuestion> = {};
        for (const q of res.data.questions) map[q.faultCode] = { question: q.question, why: q.why, source: res.source };
        setGapQuestions(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing, hydrated, status]);

  // Preselect from ?code= or the top item.
  useEffect(() => {
    if (selected || !items.length) return;
    const code = params.get("code");
    setSelected(items.find((i) => i.faultCode === code) ?? items[0]);
  }, [items, params, selected]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Interview Mode</Eyebrow>
          <h1 className="mt-1 text-2xl font-semibold">The AI interviews Raju about what&apos;s about to be lost.</h1>
          <p className="text-muted">Questions come from fault records with no captured fix, and from juniors&apos; questions the ghost couldn&apos;t answer.</p>
        </div>
        {loading && (
          <Badge tone="info">
            <Loader2 className="h-3 w-3 animate-spin" /> Writing questions…
          </Badge>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-2">
          {items.length === 0 && <Card className="text-sm text-ok">No open gaps or questions. Raju&apos;s knowledge is bottled.</Card>}
          {items.map((it) => (
            <button
              key={it.id}
              onClick={() => setSelected(it)}
              className={cn(
                "w-full rounded-xl border p-3 text-left transition-colors",
                selected?.id === it.id ? "border-accent bg-accent/10" : "border-line bg-panel hover:border-accent/40",
              )}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge tone={it.origin === "junior" ? "info" : "bad"}>{it.origin === "junior" ? "Junior asked" : "Gap"}</Badge>
                {it.faultCode && <Badge tone="accent">{it.faultCode}</Badge>}
                <span className="text-xs text-muted">{machineById(it.machineId)?.name}</span>
              </div>
              <div className="mt-2 text-sm leading-snug">{it.question}</div>
              <div className="mt-1 text-xs text-muted">{it.why}</div>
            </button>
          ))}
          {cov.gaps.length > 0 && (
            <p className="px-1 text-xs text-muted">{hours(cov.atRiskMin)} of last year&apos;s downtime has no captured fix.</p>
          )}
        </div>

        <div className="space-y-4">
          {selected ? (
            <>
              <Card className="flex flex-wrap items-center gap-3">
                <MessageCircleQuestion className="h-5 w-5 text-accent" />
                <div className="min-w-0 flex-1 text-sm text-muted">
                  Read the question aloud to Raju, then hit record while he answers. <SourceBadge source={selected.source} />
                </div>
                <Button
                  size="sm"
                  variant={speaker.speaking ? "danger" : "outline"}
                  onClick={() => (speaker.speaking ? speaker.stop() : void speaker.speak(selected.question, "en-IN", "priya"))}
                >
                  <Volume2 className="h-4 w-4" /> {speaker.speaking ? "Stop" : "Ask aloud"}
                </Button>
              </Card>
              <CaptureStudio
                key={selected.id}
                stacked
                presetMachineId={selected.machineId || undefined}
                question={selected.question}
                onSaved={() => {
                  if (selected.origin === "junior") dequeue(selected.id);
                }}
              />
            </>
          ) : (
            <Card className="text-sm text-muted">Pick a question.</Card>
          )}
        </div>
      </div>
    </div>
  );
}
