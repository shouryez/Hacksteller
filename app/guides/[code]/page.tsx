"use client";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, FileText, Lightbulb, Loader2, Mic, Printer, QrCode, Wrench } from "lucide-react";
import { AudioClip } from "@/components/AudioClip";
import { StepChecklist } from "@/components/StepChecklist";
import { Badge, Button, Card, Eyebrow, SourceBadge } from "@/components/ui";
import { deflateToBase64Url, postJson } from "@/lib/client";
import { buildGuide, guideCacheKey, toShared } from "@/lib/guide";
import { FAULT_RECORDS, expertById, faultStats, hours, machineById } from "@/lib/seed";
import { useStore } from "@/lib/store";
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

  const stat = faultStats().find((f) => f.faultCode === code);
  const records = FAULT_RECORDS.filter((r) => r.faultCode === code).slice(-5).reverse();
  const machine = machineById(stat?.machineId ?? stories.find((s) => s.extraction.faultCodes.includes(code))?.machineId ?? "");
  const key = guideCacheKey(code, stories);
  const local = useMemo(() => buildGuide(code, stories), [code, stories]);
  const fresh = cache && cache.key === key ? cache : null;
  const guide: Guide | null = fresh?.guide ?? local;
  const source: Source | undefined = fresh?.source ?? (local ? "offline" : undefined);
  const linked = stories.filter((s) => s.extraction.faultCodes.includes(code));

  // Let the AI merge multi-story guides into one clean procedure (cached per set of stories).
  useEffect(() => {
    if (!hydrated || !local || fresh || !status?.ai || demoMode) return;
    setMerging(true);
    postJson<Guide>("/api/guide", { faultCode: code, stories, demo: demoMode })
      .then((res) => cacheGuide(code, { key, guide: res.data, source: res.source }))
      .catch(() => {})
      .finally(() => setMerging(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, key, status?.ai, demoMode]);

  // The QR carries the whole guide (compressed) so it opens on any phone, offline, without our database.
  useEffect(() => {
    if (!guide) return setQrUrl(null);
    deflateToBase64Url(JSON.stringify(toShared(guide, machine?.name ?? ""))).then((d) => setQrUrl(`${window.location.origin}/g#${d}`));
  }, [guide, machine?.name]);

  return (
    <div className="space-y-5">
      {qrBig && qrUrl && (
        <button
          onClick={() => setQrBig(false)}
          className="no-print fixed inset-0 z-50 grid place-items-center bg-black/85 p-6"
          aria-label="Close QR code"
        >
          <div className="rounded-2xl bg-white p-6 text-center text-black">
            <QRCodeSVG value={qrUrl} size={Math.min(560, typeof window === "undefined" ? 480 : window.innerHeight - 160)} level="L" marginSize={2} />
            <div className="mt-3 text-lg font-semibold">
              Scan with your phone camera: {code} guide
            </div>
            <div className="text-sm text-gray-600">The whole guide is inside the code. No app, no login, no internet needed to read it.</div>
          </div>
        </button>
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
              <SourceBadge source={source} />
            </div>
          </div>
          {guide && qrUrl && (
            <button onClick={() => setQrBig(true)} className="rounded-xl bg-white p-3 text-center text-black" title="Enlarge to scan">
              <QRCodeSVG value={qrUrl} size={190} level="L" marginSize={1} />
              <div className="mt-1 flex items-center justify-center gap-1 text-[11px] font-medium">
                <QrCode className="h-3 w-3" /> Tap to enlarge · works offline
              </div>
            </button>
          )}
        </div>
      </Card>

      {!guide ? (
        <Card className="border-bad/40 bg-bad/5">
          <div className="text-lg font-semibold text-bad">No one has explained this fault yet.</div>
          <p className="mt-1 text-muted">
            It happened {stat?.occurrences ?? 0} times and cost {hours(stat?.downtimeMin ?? 0)}. Records only say things like &ldquo;{records[0]?.resolutionNote ?? "—"}&rdquo;.
          </p>
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
            </Card>
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
              <ul className="space-y-1 font-mono text-xs text-muted">
                {records.map((r) => (
                  <li key={r.recordId}>
                    {r.date} · {r.technician} · &ldquo;{r.resolutionNote}&rdquo;
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
