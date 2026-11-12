"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, GraduationCap, RotateCcw, Trophy, X } from "lucide-react";
import { AudioClip } from "@/components/AudioClip";
import { Badge, Button, Card, Eyebrow, cn } from "@/components/ui";
import { buildDrill, type DrillKind } from "@/lib/drill";
import { PRIMARY_EXPERT, expertById } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { useRecords } from "@/hooks/useRecords";

const KIND_LABEL: Record<DrillKind, string> = { first: "First move", manual: "Manual trap", cause: "Diagnosis", safety: "Safety" };

export default function DrillPage() {
  const stories = useStore((s) => s.stories);
  const records = useRecords();
  const best = useStore((s) => s.drillBest);
  const setBest = useStore((s) => s.setDrillBest);
  const [seed, setSeed] = useState<number | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);

  const questions = useMemo(() => (seed === null ? [] : buildDrill(stories, records, seed)), [seed, stories, records]);
  const available = useMemo(() => buildDrill(stories, records, 1).length, [stories, records]);
  const q = questions[i];
  const finished = seed !== null && i >= questions.length;
  const score = answers.filter(Boolean).length;
  const first = PRIMARY_EXPERT.name.split(" ")[0];

  function start() {
    setSeed(Math.floor(Math.random() * 1e9));
    setI(0);
    setPicked(null);
    setAnswers([]);
  }

  function pick(k: number) {
    if (picked !== null || !q) return;
    setPicked(k);
    setAnswers((a) => [...a, k === q.answer]);
  }

  function next() {
    if (i + 1 >= questions.length) setBest(Math.round(((score) / questions.length) * 100));
    setPicked(null);
    setI((x) => x + 1);
  }

  if (seed === null) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 py-6 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent/15 text-accent">
          <GraduationCap className="h-9 w-9" />
        </div>
        <div>
          <Eyebrow>Apprentice drill</Eyebrow>
          <h1 className="mt-1 text-3xl font-semibold">Would you fix it the way {first} would?</h1>
          <p className="mt-2 text-muted">
            Scenario questions built from the recordings. The wrong answers are the real traps: what the manual says, and what juniors usually try.
          </p>
        </div>
        <Card className="text-left text-sm text-muted">
          <ul className="list-inside list-disc space-y-1">
            <li>{Math.min(8, available)} questions drawn from {stories.length} recorded stories</li>
            <li>Every answer is explained in the expert&apos;s own words, with the recording</li>
            <li>New recordings become new questions automatically</li>
          </ul>
        </Card>
        <div className="flex items-center justify-center gap-3">
          <Button variant="primary" size="lg" onClick={start} disabled={available === 0}>
            Start the drill
          </Button>
          {best > 0 && (
            <Badge tone="ok">
              <Trophy className="h-3.5 w-3.5" /> Best: {best}%
            </Badge>
          )}
        </div>
        {available === 0 && <p className="text-sm text-muted">Record at least one story first.</p>}
      </div>
    );
  }

  if (finished) {
    const pctScore = questions.length ? Math.round((score / questions.length) * 100) : 0;
    const missed = [...new Set(questions.filter((_, k) => !answers[k]).map((x) => x.faultCode))];
    return (
      <div className="mx-auto max-w-2xl space-y-5 py-6 text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mx-auto grid h-24 w-24 place-items-center rounded-full border-4 border-accent text-3xl font-bold">
          {pctScore}%
        </motion.div>
        <h1 className="text-3xl font-semibold">
          {score} of {questions.length} the way {first} would
        </h1>
        <p className="text-muted">
          {pctScore === 100 ? `${first} can retire in peace.` : pctScore >= 70 ? "Solid. Review the ones you missed before your next shift." : `Spend ten minutes with the guides below. ${first} won't be here to call.`}
        </p>
        {missed.length > 0 && (
          <Card className="text-left">
            <Eyebrow className="mb-2">Review these guides</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {missed.map((c) => (
                <Link key={c} href={`/guides/${c}`}>
                  <Button size="sm">{c}</Button>
                </Link>
              ))}
            </div>
          </Card>
        )}
        <Button variant="primary" size="lg" onClick={start}>
          <RotateCcw className="h-5 w-5" /> New drill
        </Button>
      </div>
    );
  }

  const story = stories.find((s) => s.id === q.storyId);
  const storyExpert = (story && expertById(story.expertId)?.name.split(" ")[0]) || first;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <Eyebrow>Apprentice drill</Eyebrow>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${((i + (picked !== null ? 1 : 0)) / questions.length) * 100}%` }} />
        </div>
        <span className="text-xs tabular-nums text-muted">
          {i + 1}/{questions.length}
        </span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={q.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
          <Card className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="accent">{q.faultCode}</Badge>
              <Badge tone={q.kind === "manual" ? "warn" : q.kind === "safety" ? "bad" : "neutral"}>{KIND_LABEL[q.kind]}</Badge>
            </div>
            <h2 className="text-xl font-medium leading-snug">{q.prompt}</h2>
            <div className="space-y-2">
              {q.options.map((opt, k) => {
                const isAnswer = k === q.answer;
                const chosen = picked === k;
                return (
                  <button
                    key={k}
                    onClick={() => pick(k)}
                    disabled={picked !== null}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-3 text-left text-sm transition-colors",
                      picked === null && "border-white/10 bg-white/[0.03] hover:border-accent/60",
                      picked !== null && isAnswer && "border-ok bg-ok/10",
                      picked !== null && chosen && !isAnswer && "border-bad bg-bad/10",
                      picked !== null && !chosen && !isAnswer && "border-white/10 bg-white/[0.03] opacity-50",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                        picked !== null && isAnswer ? "border-ok bg-ok text-black" : picked !== null && chosen ? "border-bad bg-bad text-white" : "border-white/10 text-muted",
                      )}
                    >
                      {picked !== null && isAnswer ? <Check className="h-3.5 w-3.5" /> : picked !== null && chosen ? <X className="h-3.5 w-3.5" /> : String.fromCharCode(65 + k)}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-3">
                <div className={cn("font-semibold", picked === q.answer ? "text-ok" : "text-bad")}>
                  {picked === q.answer ? `Exactly what ${storyExpert} would do.` : "Not quite."}
                </div>
                <p className="text-sm text-text/90">{q.explain}</p>
                {q.quote && <p className="text-sm italic text-muted">&ldquo;{q.quote}&rdquo;</p>}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  {story ? <AudioClip story={story} label="Hear the recording" /> : <span />}
                  <Button variant="primary" onClick={next}>
                    {i + 1 >= questions.length ? "See my score" : "Next question"}
                  </Button>
                </div>
              </motion.div>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
