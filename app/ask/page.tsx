"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Ghost, Loader2, Mic, Send, Square, Volume2, Wrench } from "lucide-react";
import { AudioClip } from "@/components/AudioClip";
import { Badge, Button, Card, Eyebrow, Select, SourceBadge, cn } from "@/components/ui";
import { postJson } from "@/lib/client";
import { transcribeWithSarvam } from "@/lib/audio";
import { guessFault } from "@/lib/offline";
import { PRIMARY_EXPERT, expertById, machineById } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { AskResult, Lang, Source } from "@/lib/types";
import { useRecorder } from "@/hooks/useRecorder";
import { useSpeaker } from "@/hooks/useSpeaker";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useStatus } from "@/hooks/useStatus";

const EXAMPLES = [
  "Machine four is getting hot and the alarm keeps coming back",
  "The press ram is slow and there's a whining noise",
  "Parts on the moulding machine are not filling fully",
  "The tool changer on the lathe is not indexing properly",
];

type Turn = { question: string; result: AskResult; source: Source; note?: string };

export default function AskPage() {
  const status = useStatus();
  const stories = useStore((s) => s.stories);
  const demoMode = useStore((s) => s.demoMode);
  const answerLang = useStore((s) => s.answerLang);
  const setAnswerLang = useStore((s) => s.setAnswerLang);
  const enqueue = useStore((s) => s.enqueue);
  const speaker = useSpeaker(Boolean(status?.sarvam));
  const speech = useSpeechRecognition(answerLang);
  const rec = useRecorder();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    const text = q.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    speaker.stop();
    try {
      const res = await postJson<AskResult>("/api/ask", { question: text, stories, answerLang, demo: demoMode });
      setTurns((t) => [{ question: text, result: res.data, source: res.source, note: res.note }, ...t]);
      setQuestion("");
      if (res.data.notCovered) {
        const fault = guessFault(text);
        enqueue({
          question: res.data.suggestedInterviewQuestion || `Raju, a junior asked: "${text}". What do you check first, and what's the real fix?`,
          faultCode: fault?.faultCode ?? "",
          machineId: fault?.machineId ?? "",
          why: `A junior asked: “${text}”`,
          origin: "junior",
        });
        toast("Added to Raju's interview list", { tone: "warn", description: "The ghost won't guess. This gap will be captured next." });
      }
      void speaker.speak(res.data.spokenAnswer, answerLang, PRIMARY_EXPERT.voice);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function toggleMic() {
    if (!listening) {
      speaker.stop();
      setListening(true);
      if (speech.supported) speech.start();
      else if (status?.sarvam) await rec.start();
      else {
        setListening(false);
        setError("Voice input needs Chrome (or a Sarvam key). Type your question instead.");
      }
      return;
    }
    setListening(false);
    if (speech.supported) {
      speech.stop();
      const text = (speech.finalText + " " + speech.interim).trim();
      if (text) await ask(text);
    } else {
      const blob = await rec.stop();
      if (!blob) return;
      setLoading(true);
      try {
        const r = await transcribeWithSarvam(blob, answerLang);
        await ask(r.transcript);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Transcription failed");
        setLoading(false);
      }
    }
  }

  const liveText = listening ? (speech.finalText + " " + speech.interim).trim() : "";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Eyebrow>Ask the Ghost · junior technician view</Eyebrow>
        <h1 className="mt-1 text-2xl font-semibold">Describe the problem like you would on the shop floor.</h1>
        <p className="text-muted">Answers come only from recorded senior knowledge, with the original recording as proof.</p>
      </div>

      <Card className="space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => void toggleMic()}
            disabled={loading}
            className={cn(
              "grid h-12 w-12 shrink-0 place-items-center rounded-full transition-colors",
              listening ? "pulse-ring bg-bad text-white" : "bg-accent text-black hover:bg-orange-400",
            )}
            aria-label={listening ? "Stop listening" : "Ask by voice"}
          >
            {listening ? <Square className="h-5 w-5" fill="currentColor" /> : <Mic className="h-6 w-6" />}
          </button>
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(question);
            }}
          >
            <input
              value={listening ? liveText : question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={listening ? "Listening…" : "e.g. machine four is getting hot and the alarm keeps coming back"}
              className="h-12 min-w-0 flex-1 rounded-lg border border-line bg-panel2 px-4 text-base outline-none focus:border-accent"
            />
            <Button type="submit" variant="primary" size="lg" disabled={loading || !question.trim()}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => void ask(ex)}
                disabled={loading}
                className="rounded-full border border-line bg-panel2 px-3 py-1 text-xs text-muted hover:border-accent/50 hover:text-text"
              >
                {ex}
              </button>
            ))}
          </div>
          <Select
            className="w-44"
            label="Answer language"
            value={answerLang}
            onChange={(v) => setAnswerLang(v as Lang)}
            options={[
              { value: "en-IN", label: "English" },
              { value: "hi-IN", label: "हिंदी Hindi" },
              { value: "kn-IN", label: "ಕನ್ನಡ Kannada" },
            ]}
          />
        </div>
        {error && <p className="text-sm text-bad">{error}</p>}
      </Card>

      {loading && (
        <Card className="flex items-center gap-3 text-muted">
          <Ghost className="h-5 w-5 animate-bounce text-accent" /> Searching Raju&apos;s recordings…
        </Card>
      )}

      <AnimatePresence initial={false}>
        {turns.map((t, idx) => (
          <motion.div key={turns.length - idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <AnswerCard
              turn={t}
              latest={idx === 0}
              speaking={idx === 0 && speaker.speaking}
              onSpeak={() => (speaker.speaking ? speaker.stop() : void speaker.speak(t.result.spokenAnswer, answerLang, PRIMARY_EXPERT.voice))}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function AnswerCard({ turn, latest, speaking, onSpeak }: { turn: Turn; latest: boolean; speaking: boolean; onSpeak: () => void }) {
  const stories = useStore((s) => s.stories);
  const r = turn.result;
  const cited = stories.filter((s) => r.citedStoryIds.includes(s.id));
  return (
    <Card className={cn("space-y-4", !latest && "opacity-70")}>
      <div className="text-sm text-muted">
        <span className="font-medium text-text">Suresh (junior):</span> &ldquo;{turn.question}&rdquo;
      </div>
      <div className="flex gap-3">
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-full", r.notCovered ? "bg-panel2 text-muted" : "bg-accent/15 text-accent")}>
          <Ghost className={cn("h-6 w-6", speaking && "animate-pulse")} />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium">Raju&apos;s ghost</span>
            <Badge tone="neutral">AI voice reconstruction</Badge>
            {!r.notCovered && <Badge tone={r.confidence === "high" ? "ok" : r.confidence === "medium" ? "warn" : "bad"}>{r.confidence} confidence</Badge>}
            <SourceBadge source={turn.source} note={turn.note} />
          </div>
          <p className="text-lg leading-snug">{latest ? <Typewriter text={r.spokenAnswer} /> : r.spokenAnswer}</p>
          <Button size="sm" variant="ghost" onClick={onSpeak}>
            {speaking ? <VoiceBars /> : <Volume2 className="h-4 w-4" />} {speaking ? "Stop" : "Play answer"}
          </Button>
        </div>
      </div>

      {r.notCovered ? (
        <div className="rounded-lg border border-warn/40 bg-warn/5 p-3 text-sm">
          <div className="font-medium text-warn">Not covered yet, so I won&apos;t guess.</div>
          <div className="mt-1 text-muted">Added to Raju&apos;s interview list: &ldquo;{r.suggestedInterviewQuestion}&rdquo;</div>
          <Link href="/interview" className="mt-2 inline-block">
            <Button size="sm" variant="primary">
              Open Interview Mode
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {r.safetyWarnings.length > 0 && (
            <div className="rounded-lg border border-bad/40 bg-bad/5 p-3 text-sm">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-bad">
                <AlertTriangle className="h-4 w-4" /> Safety first
              </div>
              <ul className="list-inside list-disc">
                {r.safetyWarnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {r.steps.length > 0 && (
            <ol className="space-y-1.5">
              {r.steps.map((s, i) => (
                <li key={i} className="flex gap-3 rounded-lg border border-line bg-panel2 px-3 py-2 text-sm">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ok/15 text-xs font-semibold text-ok">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          )}
          {r.tools.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <Wrench className="h-3.5 w-3.5" /> Tools:
              {r.tools.map((t) => (
                <Badge key={t} tone="info">
                  {t}
                </Badge>
              ))}
            </div>
          )}
          {cited.length > 0 && (
            <div className="space-y-2">
              <Eyebrow>Proof: where this came from</Eyebrow>
              {cited.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-panel2 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{s.extraction.title}</div>
                    <div className="text-xs text-muted">
                      {expertById(s.expertId)?.name} · {machineById(s.machineId)?.name} · recorded {new Date(s.createdAt).toLocaleDateString()}
                    </div>
                    {s.extraction.tribalTips[0] && <div className="mt-1 text-xs italic text-muted">&ldquo;{s.extraction.tribalTips[0].quote}&rdquo;</div>}
                  </div>
                  <AudioClip story={s} label={`Hear ${expertById(s.expertId)?.name.split(" ")[0] ?? "them"} say it`} />
                  {s.extraction.faultCodes[0] && (
                    <Link href={`/guides/${s.extraction.faultCodes[0]}`}>
                      <Button size="sm">Guide</Button>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Card>
  );
}

function Typewriter({ text }: { text: string }) {
  const words = text.split(" ");
  const [n, setN] = useState(0);
  const [shownFor, setShownFor] = useState(text);
  if (shownFor !== text) {
    setShownFor(text);
    setN(0);
  }
  useEffect(() => {
    if (n >= words.length) return;
    const t = setTimeout(() => setN((x) => x + 1), 45);
    return () => clearTimeout(t);
  }, [n, words.length]);
  return (
    <>
      {words.slice(0, n).join(" ")}
      {n < words.length && <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-accent align-middle" />}
    </>
  );
}

function VoiceBars() {
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="w-0.5 rounded-full bg-accent"
          animate={{ height: ["30%", "100%", "45%", "80%", "30%"] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
        />
      ))}
    </span>
  );
}
