"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CircleDashed, Keyboard, ListChecks, Loader2, Mic, PlayCircle, RotateCcw, Sparkles, Square, TrendingUp, Volume2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { useStatus } from "@/hooks/useStatus";
import { useRecorder } from "@/hooks/useRecorder";
import { useRecords } from "@/hooks/useRecords";
import { useSpeaker } from "@/hooks/useSpeaker";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { postJson } from "@/lib/client";
import { saveAudio, transcribeWithSarvam } from "@/lib/audio";
import { completeness } from "@/lib/completeness";
import { computeCoverage, pct } from "@/lib/coverage";
import { buildGraph, existingLabels } from "@/lib/graph";
import { machinesFor } from "@/lib/records";
import { EXPERTS, LIVE_DEMO } from "@/lib/seed";
import type { Lang, Source, Story, StoryExtraction } from "@/lib/types";
import { ExtractionCard } from "./ExtractionCard";
import { GraphLegend, KnowledgeGraph } from "./KnowledgeGraph";
import { Badge, Button, Card, Eyebrow, Select, cn } from "./ui";

type Phase = "idle" | "recording" | "transcribing" | "extracting" | "done" | "error";

const LANGS: { value: Lang; label: string }[] = [
  { value: "en-IN", label: "English (India)" },
  { value: "hi-IN", label: "हिंदी Hindi" },
  { value: "kn-IN", label: "ಕನ್ನಡ Kannada" },
];

export function CaptureStudio({
  presetMachineId,
  question,
  questionEn,
  onMachineChange,
  onSaved,
  stacked = false,
}: {
  presetMachineId?: string;
  /** Shown to the interviewer (may be Hindi/Kannada). */
  question?: string;
  /** English version, sent to the extraction prompt. */
  questionEn?: string;
  /** When set, the parent owns the machine (Interview Mode): picking one asks it to switch question. */
  onMachineChange?: (machineId: string) => void;
  onSaved?: (s: Story) => void;
  stacked?: boolean;
}) {
  const status = useStatus();
  const stories = useStore((s) => s.stories);
  const addStory = useStore((s) => s.addStory);
  const demoMode = useStore((s) => s.demoMode);
  const lang = useStore((s) => s.captureLang);
  const setLang = useStore((s) => s.setCaptureLang);
  const extraRecords = useStore((s) => s.extraRecords);
  const records = useRecords();
  const speaker = useSpeaker(Boolean(status?.sarvam));

  const [expertId, setExpertId] = useState("raju");
  const [machineId, setMachineId] = useState(presetMachineId ?? "L-04");
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [englishHint, setEnglishHint] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ story: Story; source: Source; note?: string } | null>(null);
  const [delta, setDelta] = useState<{ before: number; after: number } | null>(null);
  const [simText, setSimText] = useState<string | null>(null);

  const rec = useRecorder();
  const speech = useSpeechRecognition(lang);
  const blobRef = useRef<Blob | null>(null);
  const simAudioRef = useRef<HTMLAudioElement | null>(null);
  const simulatedRef = useRef(false);
  const storyIdRef = useRef<string | null>(null);
  const followUpRef = useRef<{ question: string; prev: string; prevEnglish: string } | null>(null);
  const [followUp, setFollowUp] = useState<string | null>(null);

  const [prevMachine, setPrevMachine] = useState(presetMachineId);
  if (presetMachineId !== prevMachine) {
    setPrevMachine(presetMachineId);
    if (presetMachineId) setMachineId(presetMachineId);
  }

  const graph = useMemo(() => buildGraph(stories, records), [stories, records]);
  const highlight = useMemo(() => {
    if (!result) return undefined;
    return new Set(graph.nodes.filter((n) => n.storyIds.includes(result.story.id)).map((n) => n.id));
  }, [graph, result]);

  const liveText =
    simText ?? (speech.finalText + (speech.interim ? ` ${speech.interim}` : "")).trim();

  async function extract(text: string, english: string) {
    setPhase("extracting");
    setError(null);
    try {
      const res = await postJson<StoryExtraction>("/api/extract", {
        transcript: text,
        englishHint: english && english !== text ? english : undefined,
        machineId,
        expertId,
        language: lang,
        existingLabels: existingLabels(stories),
        interviewQuestion: questionEn ?? question,
        extraRecords,
        demo: demoMode,
      });
      const id = storyIdRef.current ?? `story-${Date.now()}`;
      storyIdRef.current = id;
      let audioKey: string | undefined;
      if (blobRef.current) {
        await saveAudio(id, blobRef.current);
        audioKey = id;
      }
      const story: Story = {
        id,
        expertId,
        machineId,
        createdAt: new Date().toISOString(),
        language: lang,
        transcript: text,
        audioKey,
        audioUrl: simulatedRef.current ? LIVE_DEMO.audioUrl : undefined,
        interviewQuestion: question,
        extraction: res.data,
      };
      const current = useStore.getState().stories;
      const before = computeCoverage(current.filter((s) => s.id !== id), records).overall;
      const after = computeCoverage([...current.filter((s) => s.id !== id), story], records).overall;
      addStory(story);
      setDelta({ before, after });
      toast(`Captured: ${res.data.title}`, {
        description:
          after > before + 0.005 ? `Knowledge coverage ${pct(before)} → ${pct(after)}` : `${res.data.fixes.length} fixes, ${res.data.tribalTips.length} tribal tips`,
      });
      setResult({ story, source: res.source, note: res.note });
      setPhase("done");
      onSaved?.(story);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Extraction failed");
      setPhase("error");
    }
  }

  async function startRecording(followUpQuestion?: string) {
    speaker.stop();
    if (followUpQuestion) {
      followUpRef.current = { question: followUpQuestion, prev: transcript, prevEnglish: englishHint };
      setFollowUp(followUpQuestion);
      setError(null);
    } else resetRun();
    const ok = await rec.start();
    if (!ok) {
      setError("Microphone unavailable. Allow mic access, or use “Type instead” / the rehearsed story.");
      setPhase("error");
      return;
    }
    if (speech.supported) speech.start();
    setPhase("recording");
  }

  async function stopRecording() {
    if (simAudioRef.current) return finishSimulation();
    const blob = await rec.stop();
    speech.stop();
    const fu = followUpRef.current;
    followUpRef.current = null;
    setFollowUp(null);
    if (!fu) blobRef.current = blob;
    const browserText = (speech.finalText + " " + speech.interim).trim();
    let text = browserText;
    let english = "";
    if (blob && status?.sarvam) {
      setPhase("transcribing");
      try {
        const r = await transcribeWithSarvam(blob, lang);
        if (r.transcript) {
          text = r.transcript;
          english = r.english;
        }
      } catch (e) {
        console.warn("Sarvam transcription failed, using browser captions", e);
      }
    }
    if (!text) {
      setError("No speech was captured. Try again closer to the mic, or type the story instead.");
      setTyping(true);
      setPhase(fu ? "done" : "error");
      if (fu) toast("No speech was captured", { tone: "warn", description: "Try again, or type the answer into the transcript." });
      return;
    }
    if (fu) {
      // A follow-up answer extends the same story instead of starting a new one.
      const addition = (answer: string) => `\n\nFollow-up question: ${fu.question}\nAnswer: ${answer}`;
      english = english || fu.prevEnglish ? (fu.prevEnglish || fu.prev) + addition(english || text) : "";
      text = fu.prev + addition(text);
    }
    setTranscript(text);
    setEnglishHint(english);
    await extract(text, english);
  }

  function playRehearsed() {
    resetRun();
    simulatedRef.current = true;
    setMachineId(LIVE_DEMO.machineId);
    setExpertId(LIVE_DEMO.expertId);
    setLang("en-IN");
    const words = LIVE_DEMO.transcript.split(" ");
    const audio = new Audio(LIVE_DEMO.audioUrl);
    simAudioRef.current = audio;
    setSimText("");
    audio.ontimeupdate = () => {
      const ratio = audio.duration ? audio.currentTime / audio.duration : 0;
      setSimText(words.slice(0, Math.ceil(words.length * ratio)).join(" "));
    };
    audio.onended = () => void finishSimulation();
    void audio.play().catch(() => void finishSimulation());
    setPhase("recording");
  }

  async function finishSimulation() {
    const audio = simAudioRef.current;
    if (audio) {
      audio.onended = null;
      audio.ontimeupdate = null;
      audio.pause();
    }
    simAudioRef.current = null;
    setSimText(null);
    setTranscript(LIVE_DEMO.transcript);
    await extract(LIVE_DEMO.transcript, "");
  }

  function resetRun() {
    setError(null);
    setResult(null);
    setDelta(null);
    setTranscript("");
    setEnglishHint("");
    blobRef.current = null;
    simulatedRef.current = false;
    storyIdRef.current = null;
    followUpRef.current = null;
    setFollowUp(null);
  }

  const busy = phase === "transcribing" || phase === "extracting";

  return (
    <div className={cn("grid grid-cols-[minmax(0,1fr)] gap-5", !stacked && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]")}>
      <div className="space-y-4">
        <Card className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select label="Expert" value={expertId} onChange={setExpertId} options={EXPERTS.map((e) => ({ value: e.id, label: e.name }))} />
            <Select
              label="Machine"
              value={machineId}
              onChange={onMachineChange ?? setMachineId}
              options={machinesFor(records).map((m) => ({ value: m.id, label: m.name === m.id ? m.id : `${m.id} · ${m.name.split(" ").slice(0, -1).join(" ")}` }))}
            />
            <Select label="Spoken language" value={lang} onChange={(v) => setLang(v as Lang)} options={LANGS} />
          </div>

          <div className="flex flex-col items-center gap-4 py-4">
            {phase === "recording" ? (
              <button
                onClick={() => void stopRecording()}
                className="pulse-ring grid h-28 w-28 place-items-center rounded-full bg-bad text-white shadow-[0_0_40px_-4px_rgba(239,68,68,0.8)]"
                aria-label="Stop recording"
              >
                <Square className="h-10 w-10" fill="currentColor" />
              </button>
            ) : (
              <button
                onClick={() => void startRecording()}
                disabled={busy}
                className="grid h-28 w-28 place-items-center rounded-full bg-gradient-to-b from-ember to-accent text-black shadow-[0_0_60px_-8px_rgba(255,122,26,0.9),inset_0_2px_0_rgba(255,255,255,0.4)] ring-8 ring-accent/10 transition-transform hover:scale-105 disabled:opacity-50"
                aria-label="Start recording"
              >
                {busy ? <Loader2 className="h-10 w-10 animate-spin" /> : <Mic className="h-12 w-12" />}
              </button>
            )}
            <div className="flex h-8 items-end gap-1">
              {Array.from({ length: 24 }).map((_, i) => {
                const lvl = phase === "recording" ? (simAudioRef.current ? 0.3 + 0.5 * Math.abs(Math.sin(Date.now() / 200 + i)) : rec.level) : 0.05;
                const h = Math.max(3, lvl * 32 * (0.5 + 0.5 * Math.abs(Math.sin(i * 1.7))));
                return <span key={i} className={cn("w-1.5 rounded-full", phase === "recording" ? "bg-bad" : "bg-white/10")} style={{ height: h }} />;
              })}
            </div>
            <div className="text-sm text-muted">
              {phase === "idle" && "Tap the mic and tell the story the way you'd tell a new apprentice."}
              {phase === "recording" &&
                (simAudioRef.current ? "Playing the rehearsed recording…" : followUp ? `Recording follow-up · ${rec.seconds}s · tap to stop` : `Recording · ${rec.seconds}s · tap to stop`)}
              {phase === "transcribing" && "Sarvam is transcribing the recording…"}
              {phase === "extracting" && "Structuring the knowledge: symptoms → causes → fixes…"}
              {phase === "done" && "Captured. Record another, or open the guide."}
              {phase === "error" && <span className="text-bad">{error}</span>}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="ghost" onClick={playRehearsed} disabled={busy || phase === "recording"}>
                <PlayCircle className="h-4 w-4" /> Rehearsed demo story (E-311)
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setTyping((t) => !t)} disabled={busy}>
                <Keyboard className="h-4 w-4" /> Type instead
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {(phase === "recording" || liveText) && phase !== "done" && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-white/10 bg-black/30 p-3">
                <Eyebrow>Live transcript</Eyebrow>
                <p className="mt-1 min-h-12 text-sm leading-relaxed">
                  {liveText || (
                    <span className="text-muted">
                      {speech.supported ? "Listening…" : status?.sarvam ? "Listening… Sarvam will transcribe when you stop." : "Listening…"}
                    </span>
                  )}
                  {phase === "recording" && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-accent align-middle" />}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {(typing || phase === "done" || (phase === "error" && transcript)) && (
            <div className="space-y-2">
              <Eyebrow>Transcript {phase === "done" ? "(edit and re-run if needed)" : ""}</Eyebrow>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={5}
                placeholder="Type or paste what the technician said…"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm outline-none focus:border-accent"
              />
              {englishHint && englishHint !== transcript && <p className="text-xs text-muted">English (Sarvam translate): {englishHint}</p>}
              <Button variant="primary" size="sm" disabled={!transcript.trim() || busy} onClick={() => void extract(transcript.trim(), englishHint)}>
                <Sparkles className="h-4 w-4" /> {phase === "done" ? "Re-structure" : "Structure it"}
              </Button>
            </div>
          )}
        </Card>

        <AnimatePresence>
          {delta && (
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="overflow-hidden rounded-xl border border-ok/40 bg-ok/10 p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-ok" />
                <div className="text-sm">
                  <div className="font-semibold text-ok">Knowledge coverage {pct(delta.before)} → {pct(delta.after)}</div>
                  <div className="text-muted">Share of the last 12 months&apos; downtime that now has a captured fix.</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === "extracting" && (
          <Card className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-4 animate-pulse rounded bg-white/[0.04]" style={{ width: `${90 - i * 20}%` }} />
            ))}
          </Card>
        )}

        {result && phase !== "extracting" && (
          <CompletenessCard
            story={result.story}
            busy={busy || phase === "recording"}
            speaking={speaker.speaking}
            onAskAloud={(q) => (speaker.speaking ? speaker.stop() : void speaker.speak(q, "en-IN", "priya"))}
            onAnswer={(q) => void startRecording(q)}
          />
        )}

        {result && (
          <>
            <ExtractionCard story={result.story} source={result.source} note={result.note} />
            <div className="flex flex-wrap gap-2">
              {result.story.extraction.faultCodes.map((c) => (
                <Link key={c} href={`/guides/${c}`}>
                  <Button variant="primary">Open guide {c}</Button>
                </Link>
              ))}
              <Link href="/ask">
                <Button>Ask the Ghost</Button>
              </Link>
              <Button variant="ghost" onClick={resetRun}>
                <RotateCcw className="h-4 w-4" /> Record another
              </Button>
            </div>
          </>
        )}
      </div>

      <div className={cn("space-y-3", !stacked && "lg:sticky lg:top-20 lg:self-start")}>
        <div className="flex items-center justify-between">
          <Eyebrow>Living knowledge graph</Eyebrow>
          <Badge tone="neutral">{graph.nodes.length} nodes</Badge>
        </div>
        <KnowledgeGraph graph={graph} height={stacked ? 420 : 520} highlightIds={highlight} />
        <GraphLegend />
      </div>
    </div>
  );
}

/** Shows what the explanation still lacks and lets the interviewer ask for it. */
function CompletenessCard({
  story,
  busy,
  speaking,
  onAskAloud,
  onAnswer,
}: {
  story: Story;
  busy: boolean;
  speaking: boolean;
  onAskAloud: (q: string) => void;
  onAnswer: (q: string) => void;
}) {
  const { checks, done, total } = completeness(story.extraction);
  const missing = checks.filter((c) => !c.ok);
  return (
    <Card className={cn("space-y-3", missing.length ? "border-warn/40" : "border-ok/40")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Eyebrow className="flex items-center gap-1.5">
          <ListChecks className="h-3.5 w-3.5" /> Completeness check
        </Eyebrow>
        <Badge tone={missing.length ? "warn" : "ok"}>
          {done}/{total} {missing.length ? "· follow up to fill the gaps" : "· complete"}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {checks.map((c) => (
          <span
            key={c.key}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs",
              c.ok ? "border-ok/40 bg-ok/10 text-ok" : "border-warn/40 bg-warn/10 text-warn",
            )}
          >
            {c.ok ? <Check className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />} {c.label}
          </span>
        ))}
      </div>
      {missing.map((c) => (
        <div key={c.key} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="min-w-0 flex-1 text-sm">
            <span className="text-muted">Missing {c.label.toLowerCase()}. Ask: </span>
            &ldquo;{c.followUp}&rdquo;
          </div>
          <Button size="sm" variant="ghost" onClick={() => onAskAloud(c.followUp)} disabled={busy}>
            <Volume2 className="h-4 w-4" /> {speaking ? "Stop" : "Ask aloud"}
          </Button>
          <Button size="sm" onClick={() => onAnswer(c.followUp)} disabled={busy}>
            <Mic className="h-4 w-4" /> Record answer
          </Button>
        </div>
      ))}
    </Card>
  );
}
