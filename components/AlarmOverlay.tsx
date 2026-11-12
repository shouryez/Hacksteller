"use client";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, BookOpen, Mic, Siren, Volume2, VolumeX, X } from "lucide-react";
import { playAlarmTone, useAlarm } from "@/lib/alarm";
import { buildGuide } from "@/lib/guide";
import { machineName, mttr } from "@/lib/records";
import { PRIMARY_EXPERT, daysUntil, expertById, faultStats, hours, manualFor } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { useRecords } from "@/hooks/useRecords";
import { useSpeaker } from "@/hooks/useSpeaker";
import { useStatus } from "@/hooks/useStatus";
import { Button } from "./ui";

/** Full-screen response to a machine alarm: the expert's fix if one is on file, the gap if not. */
export function AlarmOverlay() {
  const alarm = useAlarm((s) => s.alarm);
  const clear = useAlarm((s) => s.clear);
  const stories = useStore((s) => s.stories);
  const records = useRecords();
  const status = useStatus();
  const speaker = useSpeaker(Boolean(status?.sarvam));

  const info = useMemo(() => {
    if (!alarm) return null;
    const stat = faultStats(records).find((f) => f.faultCode === alarm.faultCode);
    const guide = buildGuide(alarm.faultCode, stories);
    const story = stories.find((s) => s.extraction.faultCodes.includes(alarm.faultCode) && s.extraction.fixes.length);
    const expert = story ? expertById(story.expertId) : undefined;
    const m = mttr(records, alarm.faultCode);
    const lastNote = records.filter((r) => r.faultCode === alarm.faultCode && !r.viaGuide).at(-1)?.resolutionNote;
    return { stat, guide, expert, m, lastNote, manual: manualFor(alarm.faultCode), machine: machineName(alarm.machineId) };
  }, [alarm, records, stories]);

  const spoken = useMemo(() => {
    if (!alarm || !info) return "";
    const what = `Alarm on ${info.machine}. ${alarm.faultCode}, ${info.stat?.description ?? ""}.`;
    if (!info.guide) return `${what} Nobody has explained how to fix this one yet.`;
    const who = info.expert?.name.split(" ")[0] ?? "A senior technician";
    const steps = info.guide.steps.slice(0, 2).map((s) => s.text.replace(/[.;]+$/, ""));
    return `${what} ${who} has explained this one. ${info.guide.safety[0] ? `Safety first: ${info.guide.safety[0].replace(/[.;]+$/, "")}. ` : ""}Start here: ${steps.join(". Then, ")}.`;
  }, [alarm, info]);

  // Sound the alarm, then let the ghost speak.
  const at = alarm?.at;
  useEffect(() => {
    if (!at) return;
    playAlarmTone();
    const t = setTimeout(() => void speaker.speak(spoken, "en-IN", info?.expert?.voice ?? PRIMARY_EXPERT.voice), 900);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && clear();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      speaker.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at]);

  return (
    <AnimatePresence>
      {alarm && info && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="no-print fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-black/85 p-4 backdrop-blur-sm"
          role="alertdialog"
          aria-label={`Machine alarm ${alarm.faultCode}`}
        >
          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="alarm-frame relative w-full max-w-2xl rounded-2xl border-2 border-bad bg-panel p-6 shadow-[0_0_80px_-10px_rgba(239,68,68,0.7)]"
          >
            <button onClick={clear} className="absolute right-4 top-4 text-muted hover:text-text" aria-label="Dismiss alarm">
              <X className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-bad">
              <Siren className="h-4 w-4 animate-pulse" /> Machine alarm · just now
            </div>
            <h2 className="mt-2 text-3xl font-bold leading-tight">
              <span className="font-mono text-bad">{alarm.faultCode}</span> {info.stat?.description}
            </h2>
            <p className="mt-1 text-muted">
              {info.machine}
              {info.stat && (
                <>
                  {" "}
                  · seen {info.stat.occurrences}× in the last 12 months
                  {info.m.beforeN > 0 && <> · usually {hours(info.m.beforeAvg)} of downtime</>}
                </>
              )}
            </p>

            {info.guide ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-ok/40 bg-ok/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-ok">
                      {info.expert?.name.split(" ")[0] ?? "An expert"}&apos;s fix is on file · about {info.guide.estMinutes} min
                    </div>
                    <button
                      onClick={() => (speaker.speaking ? speaker.stop() : void speaker.speak(spoken, "en-IN", info.expert?.voice ?? PRIMARY_EXPERT.voice))}
                      className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-text"
                    >
                      {speaker.speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />} {speaker.speaking ? "Mute" : "Replay"}
                    </button>
                  </div>
                  {info.guide.safety[0] && (
                    <div className="mt-2 flex gap-2 text-sm text-bad">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {info.guide.safety[0]}
                    </div>
                  )}
                  <ol className="mt-2 space-y-1 text-sm">
                    {info.guide.steps.slice(0, 3).map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ok/20 text-[11px] font-semibold text-ok">{i + 1}</span>
                        {s.text}
                      </li>
                    ))}
                    {info.guide.steps.length > 3 && <li className="pl-7 text-xs text-muted">+ {info.guide.steps.length - 3} more steps in the guide</li>}
                  </ol>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/guides/${alarm.faultCode}`} onClick={clear}>
                    <Button variant="primary" size="lg">
                      <BookOpen className="h-5 w-5" /> Open the guide
                    </Button>
                  </Link>
                  <Button size="lg" onClick={clear}>
                    Dismiss
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-bad/40 bg-bad/10 p-4">
                  <div className="font-semibold text-bad">Nobody has explained how to fix this.</div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {info.lastNote && (
                      <li>
                        Last time, the fault log said only: <span className="font-mono">&ldquo;{info.lastNote}&rdquo;</span>
                      </li>
                    )}
                    {info.manual && <li className="text-muted">The manual says: {info.manual.says.slice(0, 2).join(" ")}</li>}
                    <li>
                      {PRIMARY_EXPERT.name.split(" ")[0]} knows. He retires in <span className="font-semibold text-bad">{daysUntil(PRIMARY_EXPERT.retiresOn)} days</span>.
                    </li>
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/interview?code=${alarm.faultCode}`} onClick={clear}>
                    <Button variant="primary" size="lg">
                      <Mic className="h-5 w-5" /> Interview {PRIMARY_EXPERT.name.split(" ")[0]} now
                    </Button>
                  </Link>
                  <Button size="lg" onClick={clear}>
                    Dismiss
                  </Button>
                </div>
              </div>
            )}
            <p className="mt-4 text-[11px] text-muted">Simulated alarm. In a plant this arrives as a webhook from the PLC, SCADA or maintenance system.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
