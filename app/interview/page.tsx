"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Languages, Loader2, MessageCircleQuestion, Volume2, VolumeX } from "lucide-react";
import { CaptureStudio } from "@/components/CaptureStudio";
import { Badge, Button, Card, Chip, Eyebrow, PageHeader, SourceBadge, cn } from "@/components/ui";
import { postJson } from "@/lib/client";
import { computeCoverage } from "@/lib/coverage";
import { offlineInterview } from "@/lib/offline";
import { machinesFor } from "@/lib/records";
import { hours, machineById } from "@/lib/seed";
import { useStore, type GapQuestion } from "@/lib/store";
import { toast } from "@/lib/toast";
import { useStatus } from "@/hooks/useStatus";
import { useRecords } from "@/hooks/useRecords";
import { useSpeaker } from "@/hooks/useSpeaker";
import type { InterviewQuestion, Lang } from "@/lib/types";

type Item = {
  id: string;
  question: string;
  questionEn: string;
  why: string;
  faultCode: string;
  machineId: string;
  origin: "gap" | "junior";
  source?: string;
  /** True while this item still shows the English offline wording for a non-English language. */
  pending: boolean;
};

const LANGS: { value: Lang; label: string; short: string }[] = [
  { value: "en-IN", label: "English", short: "EN" },
  { value: "hi-IN", label: "हिंदी", short: "HI" },
  { value: "kn-IN", label: "ಕನ್ನಡ", short: "KN" },
];

export default function InterviewPage() {
  return (
    <Suspense fallback={null}>
      <Interview />
    </Suspense>
  );
}

function Interview() {
  const params = useSearchParams();
  const code = params.get("code");
  const status = useStatus();
  const stories = useStore((s) => s.stories);
  const queue = useStore((s) => s.queue);
  const dequeue = useStore((s) => s.dequeue);
  const gapQuestions = useStore((s) => s.gapQuestions);
  const setGapQuestions = useStore((s) => s.setGapQuestions);
  const demoMode = useStore((s) => s.demoMode);
  const hydrated = useStore((s) => s.hydrated);
  const lang = useStore((s) => s.captureLang);
  const setLang = useStore((s) => s.setCaptureLang);
  const speaker = useSpeaker(Boolean(status?.sarvam));
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Machine chosen by the interviewer for junior questions that arrived without one.
  const [machinePick, setMachinePick] = useState<Record<string, string>>({});

  const records = useRecords();
  const cov = useMemo(() => computeCoverage(stories, records), [stories, records]);
  const fallback = useMemo(() => offlineInterview(cov.gaps, []).questions, [cov.gaps]);

  // Items are derived from the store on every render, so the panel can never show stale wording.
  const items: Item[] = useMemo(() => {
    const key = (id: string) => `${id}|${lang}`;
    const junior: Item[] = queue.map((q) => {
      const gq = gapQuestions[key(q.id)];
      return {
        id: q.id,
        question: gq?.question ?? q.question,
        questionEn: gq?.questionEn ?? q.question,
        why: q.why,
        faultCode: q.faultCode,
        machineId: q.machineId,
        origin: "junior" as const,
        source: gq?.source,
        pending: !gq && lang !== "en-IN",
      };
    });
    const gaps: Item[] = cov.gaps.map((g) => {
      const id = `gap:${g.faultCode}`;
      const gq = gapQuestions[key(id)];
      const fb = fallback.find((f) => f.faultCode === g.faultCode);
      return {
        id,
        question: gq?.question ?? fb?.question ?? "",
        questionEn: gq?.questionEn ?? fb?.questionEn ?? fb?.question ?? "",
        why: gq?.why ?? fb?.why ?? "",
        faultCode: g.faultCode,
        machineId: g.machineId,
        origin: "gap" as const,
        source: gq?.source,
        pending: !gq && lang !== "en-IN",
      };
    });
    return [...junior, ...gaps];
  }, [queue, cov.gaps, gapQuestions, fallback, lang]);

  // Ask the AI for wording (in the chosen language) for every item we haven't phrased yet.
  // Wording the offline brain wrote during an AI outage is retried (once per visit) when an AI engine is available.
  const retryOffline = Boolean(status?.ai) && !demoMode;
  const missingIds = items
    .filter((i) => {
      const gq = gapQuestions[`${i.id}|${lang}`];
      return !gq || (retryOffline && gq.source === "offline");
    })
    .map((i) => i.id)
    .join(",");
  useEffect(() => {
    if (!hydrated || !missingIds || !status) return;
    const want = new Set(missingIds.split(","));
    const gaps = cov.gaps.filter((g) => want.has(`gap:${g.faultCode}`)).map((g) => ({ ...g, id: `gap:${g.faultCode}` }));
    const junior = queue.filter((q) => want.has(q.id)).map((q) => ({ id: q.id, question: q.question, faultCode: q.faultCode, machineId: q.machineId }));
    setLoading(true);
    postJson<{ questions: InterviewQuestion[] }>("/api/interview", { gaps, junior, lang, demo: demoMode })
      .then((res) => {
        const map: Record<string, GapQuestion> = {};
        for (const q of res.data.questions) {
          const id = q.id && want.has(q.id) ? q.id : `gap:${q.faultCode}`;
          if (!want.has(id)) continue;
          map[`${id}|${lang}`] = { question: q.question, questionEn: q.questionEn || q.question, why: q.why, source: res.source };
        }
        setGapQuestions(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingIds, lang, hydrated, status]);

  // Deep link (?code=) wins whenever it changes; otherwise keep the current pick, else the top item.
  // Applied once per code, so new wording or translations arriving later never override the user's pick.
  const appliedCode = useRef<string | null>(null);
  useEffect(() => {
    if (!code || appliedCode.current === code) return;
    const hit = items.find((i) => i.faultCode === code);
    if (!hit) return;
    appliedCode.current = code;
    setSelectedId(hit.id);
  }, [code, items]);
  const selected = items.find((i) => i.id === selectedId) ?? items[0] ?? null;
  const machineId = selected ? selected.machineId || machinePick[selected.id] || "" : "";

  // The machine dropdown in the recorder follows the question: picking a machine jumps to its top open question.
  function changeMachine(id: string) {
    if (!selected || id === machineId) return;
    if (!selected.machineId) {
      setMachinePick((p) => ({ ...p, [selected.id]: id }));
      return;
    }
    const next = items.find((i) => i.machineId === id);
    if (next) setSelectedId(next.id);
    else toast(`No open questions for ${machineById(id)?.name ?? id}`, { tone: "info", description: "Use Capture to record a free story about this machine." });
  }

  const juniorCount = items.filter((i) => i.origin === "junior").length;
  const speakSelected = () => {
    if (!selected) return;
    if (speaker.speaking) speaker.stop();
    else void speaker.speak(selected.question, lang, "priya");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Interview Mode"
        title={
          <>
            The AI interviews Raju about what&apos;s <span className="text-accent">about to be lost</span>.
          </>
        }
        description="Questions come from fault records with no captured fix, and from juniors' questions the ghost couldn't answer. Pick the language Raju is comfortable in."
        actions={
          <div className="glass flex items-center gap-1 rounded-xl p-1">
            <Languages className="ml-2 h-4 w-4 text-muted" />
            {LANGS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLang(l.value)}
                className={cn("h-8 rounded-lg px-3 text-sm transition-colors", lang === l.value ? "bg-accent/15 text-accent" : "text-muted hover:text-text")}
                aria-pressed={lang === l.value}
                title={l.label}
              >
                {l.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Queue */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <Eyebrow>
              {cov.gaps.length} open gap{cov.gaps.length === 1 ? "" : "s"}
              {juniorCount > 0 && ` · ${juniorCount} from juniors`}
            </Eyebrow>
            {loading && (
              <Badge tone="info">
                <Loader2 className="h-3 w-3 animate-spin" /> {lang === "en-IN" ? "Writing" : "Translating"}…
              </Badge>
            )}
          </div>
          {items.length === 0 && (
            <Card tone="ok" className="text-sm text-ok">
              No open gaps or questions. Raju&apos;s knowledge is bottled.
            </Card>
          )}
          <div className="space-y-2">
            {items.map((it, i) => {
              const active = selected?.id === it.id;
              return (
                <motion.button
                  key={it.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.03 }}
                  onClick={() => setSelectedId(it.id)}
                  className={cn("glass w-full rounded-2xl p-3.5 text-left transition-all", active ? "glass-accent shadow-[0_0_40px_-16px_rgba(255,122,26,0.8)]" : "hover:border-white/20")}
                  aria-pressed={active}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={it.origin === "junior" ? "info" : "bad"}>{it.origin === "junior" ? "Junior asked" : "Gap"}</Badge>
                    {it.faultCode && <span className="font-mono text-xs text-accent">{it.faultCode}</span>}
                    <span className="text-xs text-muted">{machineById(it.machineId)?.name ?? it.machineId}</span>
                    {it.pending && <Loader2 className="ml-auto h-3 w-3 animate-spin text-muted" />}
                  </div>
                  <div className={cn("mt-2 text-sm leading-snug", active ? "text-text" : "text-text/85")}>{it.question}</div>
                  <div className="mt-1 text-xs text-muted">{it.why}</div>
                </motion.button>
              );
            })}
          </div>
          {cov.gaps.length > 0 && <p className="px-1 text-xs text-muted">{hours(cov.atRiskMin)} of last year&apos;s downtime has no captured fix.</p>}
        </div>

        {/* Question + capture */}
        <div className="space-y-4">
          {selected ? (
            <>
              <Card tone="accent" className="relative overflow-hidden">
                <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
                <div className="relative flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MessageCircleQuestion className="h-4 w-4 text-accent" />
                    <Eyebrow className="text-accent">Ask Raju · {LANGS.find((l) => l.value === lang)?.label}</Eyebrow>
                    {selected.pending && (
                      <Badge tone="warn">
                        <Loader2 className="h-3 w-3 animate-spin" /> translating
                      </Badge>
                    )}
                    <SourceBadge source={selected.source} />
                  </div>
                  <Button size="sm" variant={speaker.speaking ? "danger" : "glass"} onClick={speakSelected}>
                    {speaker.speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />} {speaker.speaking ? "Stop" : "Ask aloud"}
                  </Button>
                </div>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={selected.id + lang + selected.question}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="relative mt-4 text-balance text-2xl font-medium leading-snug sm:text-3xl"
                    lang={lang.slice(0, 2)}
                  >
                    {selected.question}
                  </motion.p>
                </AnimatePresence>
                {selected.questionEn !== selected.question && <p className="relative mt-2 text-sm text-muted">{selected.questionEn}</p>}
                <div className="relative mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
                  {selected.faultCode && <Badge tone="accent">{selected.faultCode}</Badge>}
                  {machineId ? (
                    <Badge tone="neutral">{machineById(machineId)?.name ?? machineId}</Badge>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-warn">
                      <AlertTriangle className="h-3.5 w-3.5" /> No machine detected for this question
                    </span>
                  )}
                  <span className="hidden sm:inline">· Read it aloud, then record while he answers.</span>
                </div>
                {!selected.machineId && (
                  <div className="relative mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted">Which machine is this about?</span>
                    {machinesFor(records).map((m) => (
                      <Chip key={m.id} active={machinePick[selected.id] === m.id} onClick={() => setMachinePick((p) => ({ ...p, [selected.id]: m.id }))}>
                        {m.id}
                      </Chip>
                    ))}
                  </div>
                )}
              </Card>
              {!machineId ? (
                <Card className="text-sm text-muted">Pick the machine above to start recording.</Card>
              ) : (
                <CaptureStudio
                  key={selected.id}
                  stacked
                  presetMachineId={machineId}
                  question={selected.question}
                  questionEn={selected.questionEn}
                  onMachineChange={changeMachine}
                  onSaved={() => {
                    if (selected.origin === "junior") dequeue(selected.id);
                  }}
                />
              )}
            </>
          ) : (
            <Card className="text-sm text-muted">Pick a question.</Card>
          )}
        </div>
      </div>
    </div>
  );
}
