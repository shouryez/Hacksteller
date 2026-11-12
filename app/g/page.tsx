"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Ghost, Lightbulb, Wrench } from "lucide-react";
import { inflateFromBase64Url } from "@/lib/client";
import type { SharedGuide } from "@/lib/guide";
import { StepChecklist } from "@/components/StepChecklist";

/** Phone view for QR-shared guides. The guide lives entirely in the URL fragment. */
export default function SharedGuidePage() {
  const [g, setG] = useState<SharedGuide | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const data = window.location.hash.slice(1);
    if (!data) return setError(true);
    inflateFromBase64Url(data)
      .then((t) => setG(JSON.parse(t) as SharedGuide))
      .catch(() => setError(true));
  }, []);

  if (error) return <div className="p-6 text-muted">This guide link is incomplete. Scan the QR code again.</div>;
  if (!g) return <div className="p-6 text-muted">Opening guide…</div>;

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 pb-10">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Ghost className="h-4 w-4 text-accent" /> GhostWrench guide · {g.m}
      </div>
      <h1 className="text-2xl font-semibold">
        <span className="font-mono text-accent">{g.c}</span> {g.t}
      </h1>
      {g.s.length > 0 && (
        <div className="rounded-xl border border-bad/40 bg-bad/10 p-4">
          <div className="mb-1 flex items-center gap-2 font-semibold text-bad">
            <AlertTriangle className="h-5 w-5" /> Safety first
          </div>
          <ul className="list-inside list-disc space-y-1">
            {g.s.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="rounded-xl border border-line bg-panel p-4">
        <div className="mb-2 flex items-center gap-2 font-semibold">
          <Wrench className="h-4 w-4 text-ok" /> Steps
        </div>
        <StepChecklist size="lg" steps={g.p.map((text) => ({ text }))} />
      </div>
      {g.o.length > 0 && <div className="text-sm text-muted">Tools: {g.o.join(", ")}</div>}
      {g.q.length > 0 && (
        <div className="rounded-xl border border-accent/40 bg-accent/5 p-4">
          <div className="mb-1 flex items-center gap-2 font-semibold text-accent">
            <Lightbulb className="h-4 w-4" /> Tips from the expert
          </div>
          <ul className="list-inside list-disc space-y-1">
            {g.q.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
