"use client";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, BadgeCheck, BookX, ClipboardCheck, FileText, Lightbulb, Loader2, Mic, Printer, QrCode, Siren, Timer, Wrench } from "lucide-react";
import { AudioClip } from "@/components/AudioClip";
import { StepChecklist } from "@/components/StepChecklist";
import { Badge, Button, Card, Eyebrow, SourceBadge } from "@/components/ui";
import { deflateToBase64Url, postJson } from "@/lib/client";
import { buildGuide, guideCacheKey, toShared } from "@/lib/guide";
import { machineName, mttr } from "@/lib/records";
import { expertById, faultStats, hours, manualFor } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { useAlarm } from "@/lib/alarm";
import { useRecords } from "@/hooks/useRecords";
import { useQrBase } from "@/hooks/useQrBase";
import { useStatus } from "@/hooks/useStatus";
import type { Guide, Source } from "@/lib/types";

export default function GuidePage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = use(params);
  const code = decodeURIComponent(raw).toUpperCase();
  const status = useStatus();
  const stories = useStore((s) => s.stories);
  const hydrated = useStore((s) => s.hydrated);
  const demoMode = useStore((s) => s.demoMode);
  const cache = useStore((s) => s.guideCache[code]);
  const cacheGuide = useStore((s) => s.cacheGuide);
  const [merging, setMerging] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrBig, setQrBig] = useState(false);
  const qr = useQrBase();
  const allRecords = useRecords();
  const extraRecords = useStore((s) => s.extraRecords);
  const logFix = useStore((s) => s.logFix);
  const raiseAlarm = useAlarm((s) => s.raise);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [logOpen, setLogOpen] = useState(false);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [technician, setTechnician] = useState("Suresh K");

  const stat = faultStats(allRecords).find((f) => f.faultCode === code);
  const records = allRecords
    .filter((r) => r.faultCode === code)
    .sort((a, b) => b.date.localeCompare(a.date) || Number(Boolean(b.viaGuide)) - Number(Boolean(a.viaGuide)))
    .slice(0, 6);
  const machineId = stat?.machineId ?? stories.find((s) => s.extraction.faultCodes.includes(code))?.machineId ?? "";
  const machine = machineId ? { id: machineId, name: machineName(machineId) } : undefined;
  const manual = manualFor(code);
  const repair = mttr(allRecords, code);
  const key = guideCacheKey(code, stories);
  const local = useMemo(() => buildGuide(code, stories), [code, stories]);
  const fresh = cache && cache.key === key ? cache : null;
  const guide: Guide | null = fresh?.guide ?? local;
  const source: Source | undefined = fresh?.source ?? (local ? "offline" : undefined);
  const linked = stories.filter((s) => s.extraction.faultCodes.includes(code));
  const corrections = linked.flatMap((s) => (s.extraction.manualCorrections ?? []).map((c) => ({ ...c, story: s })));
  const allDone = progress.total > 0 && progress.done === progress.total;

  function submitFix() {
    if (!guide || !stat) return;
    const took = Math.max(1, Math.round(minutes ?? guide.estMinutes));
    const experts = [...new Set(linked.map((s) => expertById(s.expertId)?.name.split(" ")[0]).filter(Boolean))].join(" & ");
    logFix({
      date: new Date().toISOString().slice(0, 10),
      machineId: stat.machineId,
      faultCode: code,
      description: stat.description,
      downtimeMin: took,
      technician: technician.trim() || "unknown",
      resolutionNote: `Fixed with GhostWrench guide (${experts || "expert"}): ${linked.flatMap((s) => s.extraction.fixes.map((f) => f.label)).slice(0, 3).join("; ")}`,
    });
    setLogOpen(false);
    toast("Fix logged in the fault record", {
      description: repair.beforeN ? `${code}: usually ${Math.round(repair.beforeAvg)} min → ${took} min with the guide` : `${code} fixed in ${took} min`,
    });
  }

  // Let the AI merge multi-story guides into one clean procedure (cached per set of stories).
  useEffect(() => {
    if (!hydrated || !local || fresh || !status?.ai || demoMode) return;
    setMerging(true);
    postJson<Guide>("/api/guide", { faultCode: code, stories, extraRecords, demo: demoMode })
      .then((res) => cacheGuide(code, { key, guide: res.data, source: res.source }))
      .catch(() => {})
      .finally(() => setMerging(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, key, status?.ai, demoMode]);

  // The QR carries the whole guide (compressed) so it opens on any phone, offline, without our database.
  useEffect(() => {
    if (!guide || !qr.base) return setQrUrl(null);
    deflateToBase64Url(JSON.stringify(toShared(guide, machine?.name ?? ""))).then((d) => setQrUrl(`${qr.base}/g#${d}`));
  }, [guide, machine?.name, qr.base]);

  return (
    <div className="space-y-5">
      {qrBig && qrUrl && (
        <div onClick={() => setQrBig(false)} className="no-print fixed inset-0 z-50 grid place-items-center bg-black/85 p-6" role="dialog" aria-label="QR code">
          <div onClick={(e) => e.stopPropagation()} className="relative max-w-[92vw] rounded-2xl bg-white p-6 text-center text-black">
            <button onClick={() => setQrBig(false)} className="absolute right-3 top-2 text-2xl leading-none text-gray-500 hover:text-black" aria-label="Close QR code">
              ×
            </button>
            <QRCodeSVG value={qrUrl} size={Math.min(520, typeof window === "undefined" ? 480 : window.innerHeight - 230)} level="L" marginSize={2} />
            <div className="mt-3 text-lg font-semibold">Scan with your phone camera: {code} guide</div>
            {qr.lan ? (
              <div className="mx-auto mt-1 max-w-md text-sm text-gray-600">
                Opens <span className="font-mono">{qr.base}</span>. The phone must be on the <b>same Wi-Fi</b> as this laptop.
                {qr.options.length > 1 && (
                  <div className="mt-2">
                    Not opening? Try another address:{" "}
                    <select
                      value={qr.chosen ?? ""}
                      onChange={(e) => qr.choose(e.target.value)}
                      className="rounded border border-gray-300 px-2 py-1 font-mono text-sm"
                    >
                      {qr.options.map((ip) => (
                        <option key={ip} value={ip}>
                          {ip}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-gray-600">The whole guide is inside the code. No app, no login needed to read it.</div>
            )}
          </div>
        </div>
      )}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href="/guides" className="text-sm text-muted hover:text-text">
          ← All guides
        </Link>
        <div className="flex gap-2">
          {merging && (
            <Badge tone="info">
              <Loader2 className="h-3 w-3 animate-spin" /> AI is merging stories…
            </Badge>
          )}
          {stat && (
            <Button size="sm" onClick={() => raiseAlarm(code, stat.machineId)} title="Simulate this machine raising the alarm">
              <Siren className="h-4 w-4" /> Simulate alarm
            </Button>
          )}
          {guide && (
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          )}
        </div>
      </div>

      <Card className="print-plain">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Eyebrow>
              {machine?.name ?? "Unknown machine"} · troubleshooting guide
            </Eyebrow>
            <h1 className="mt-1 text-3xl font-semibold">
              <span className="font-mono text-accent">{code}</span> {stat?.description}
            </h1>
            {guide && <p className="mt-2 max-w-3xl text-muted">{guide.overview}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {stat && (
                <>
                  <Badge tone="neutral">{stat.occurrences}× in 12 months</Badge>
                  <Badge tone="neutral">{hours(stat.downtimeMin)} downtime</Badge>
                  <Badge tone="neutral">last seen {stat.lastDate}</Badge>
                </>
              )}
              {guide && <Badge tone="ok">~{guide.estMinutes} min</Badge>}
              {repair.guidedN > 0 && (
                <Badge tone="ok">
                  <BadgeCheck className="h-3.5 w-3.5" /> Confirmed in the field ×{repair.guidedN}
                </Badge>
              )}
              <SourceBadge source={source} />
            </div>
          </div>
          {guide && qrUrl && (
            <button onClick={() => setQrBig(true)} className="rounded-xl bg-white p-3 text-center text-black" title="Enlarge to scan">
              <QRCodeSVG value={qrUrl} size={190} level="L" marginSize={1} />
              <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-medium">
                <QrCode className="h-3 w-3" /> Tap to enlarge{qr.lan ? " · same Wi-Fi" : ""}
              </div>
            </button>
          )}
        </div>
      </Card>

      {!guide ? (
        <Card className="border-bad/40 bg-bad/5">
          <div className="text-lg font-semibold text-bad">No one has explained this fault yet.</div>
          <p className="mt-1 text-muted">
            It happened {stat?.occurrences ?? 0} times and cost {hours(stat?.downtimeMin ?? 0)}. Records only say things like &ldquo;{records.find((r) => !r.viaGuide)?.resolutionNote || "—"}&rdquo;.
          </p>
          {manual && (
            <div className="mt-3 rounded-lg border border-line bg-panel2 p-3 text-sm">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
                <BookX className="h-3.5 w-3.5" /> All the manual offers · {manual.source}
              </div>
              <ol className="list-inside list-decimal text-muted">
                {manual.says.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ol>
            </div>
          )}
          <Link href={`/interview?code=${code}`} className="mt-3 inline-block">
            <Button variant="primary">
              <Mic className="h-4 w-4" /> Interview Raju about {code}
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            {guide.safety.length > 0 && (
              <Card className="print-plain border-bad/40 bg-bad/5">
                <div className="mb-2 flex items-center gap-2 font-semibold text-bad">
                  <AlertTriangle className="h-5 w-5" /> Safety before you start
                </div>
                <ul className="list-inside list-disc space-y-1">
                  {guide.safety.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </Card>
            )}
            <Card className="print-plain">
              <Eyebrow className="mb-3 flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" /> Procedure
              </Eyebrow>
              <StepChecklist
                onProgress={(done, total) => setProgress({ done, total })}
                steps={guide.steps.map((st) => ({
                  text: st.text,
                  meta: st.sourceStoryIds
                    .map((id) => expertById(linked.find((l) => l.id === id)?.expertId ?? "")?.name.split(" ")[0])
                    .filter(Boolean)
                    .join(", "),
                }))}
              />
              {guide.tools.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {guide.tools.map((t) => (
                    <Badge key={t} tone="info">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="no-print mt-4 border-t border-line pt-4">
                {!logOpen ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant={allDone ? "primary" : "outline"} onClick={() => setLogOpen(true)}>
                      <ClipboardCheck className="h-4 w-4" /> {allDone ? "All steps done: log this fix" : "Log this fix"}
                    </Button>
                    <span className="text-xs text-muted">Writes a proper resolution into the fault record, so the log finally says how it was fixed.</span>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-xs text-muted">
                      Time taken (min)
                      <input
                        type="number"
                        min={1}
                        value={minutes ?? guide.estMinutes}
                        onChange={(e) => setMinutes(Number(e.target.value) || 1)}
                        className="h-10 w-28 rounded-lg border border-line bg-panel2 px-3 text-sm text-text outline-none focus:border-accent"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted">
                      Fixed by
                      <input
                        value={technician}
                        onChange={(e) => setTechnician(e.target.value)}
                        className="h-10 w-44 rounded-lg border border-line bg-panel2 px-3 text-sm text-text outline-none focus:border-accent"
                      />
                    </label>
                    <Button variant="primary" onClick={submitFix}>
                      Save to fault log
                    </Button>
                    <Button variant="ghost" onClick={() => setLogOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </Card>
            {(corrections.length > 0 || manual) && (
              <Card className="print-plain">
                <Eyebrow className="mb-3 flex items-center gap-1.5">
                  <BookX className="h-3.5 w-3.5 text-accent" /> Manual vs expert{manual ? ` · ${manual.source}` : ""}
                </Eyebrow>
                {corrections.length > 0 ? (
                  <div className="space-y-2">
                    {corrections.map((c, i) => (
                      <div key={i} className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-lg border border-line bg-panel2 p-3 text-sm">
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">The manual says</div>
                          <span className="text-muted line-through decoration-bad/60">{c.manualSays}</span>
                        </div>
                        <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 text-sm">
                          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-accent">
                            {expertById(c.story.expertId)?.name.split(" ")[0]} does
                          </div>
                          {c.expertSays}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ol className="list-inside list-decimal text-sm text-muted">
                    {manual?.says.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ol>
                )}
              </Card>
            )}
          </div>
          <div className="space-y-4">
            {guide.tips.length > 0 && (
              <Card className="print-plain">
                <Eyebrow className="mb-2 flex items-center gap-1.5 text-accent">
                  <Lightbulb className="h-3.5 w-3.5" /> What the manual won&apos;t tell you
                </Eyebrow>
                <div className="space-y-2">
                  {guide.tips.map((t, i) => (
                    <blockquote key={i} className="rounded-lg border-l-2 border-accent bg-accent/5 px-3 py-2 text-sm">
                      <div className="font-medium">{t.text}</div>
                      <div className="mt-0.5 italic text-muted">&ldquo;{t.quote}&rdquo;</div>
                    </blockquote>
                  ))}
                </div>
              </Card>
            )}
            <Card className="no-print">
              <Eyebrow className="mb-2">Sources</Eyebrow>
              <div className="space-y-2">
                {linked.map((s) => (
                  <div key={s.id} className="rounded-lg border border-line bg-panel2 p-3">
                    <div className="text-sm font-medium">{s.extraction.title}</div>
                    <div className="mb-2 text-xs text-muted">
                      {expertById(s.expertId)?.name} · {new Date(s.createdAt).toLocaleDateString()}
                    </div>
                    <AudioClip story={s} />
                  </div>
                ))}
              </div>
            </Card>
            <Card className="print-plain">
              <Eyebrow className="mb-2 flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> What the fault log says
              </Eyebrow>
              {repair.guidedN > 0 && repair.beforeN > 0 && (
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-sm">
                  <Timer className="h-4 w-4 shrink-0 text-ok" />
                  <span>
                    Repair time: <span className="text-muted line-through">{Math.round(repair.beforeAvg)} min</span>{" "}
                    <span className="font-semibold text-ok">→ {Math.round(repair.guidedAvg)} min</span> with the guide
                  </span>
                </div>
              )}
              <ul className="space-y-1.5 font-mono text-xs text-muted">
                {records.map((r) => (
                  <li key={r.recordId} className={r.viaGuide ? "text-ok" : undefined}>
                    {r.date} · {r.technician} · {r.downtimeMin} min · &ldquo;{r.resolutionNote || "—"}&rdquo;
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
