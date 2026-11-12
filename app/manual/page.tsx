"use client";
import Link from "next/link";
import { useMemo } from "react";
import { BookX, Mic } from "lucide-react";
import { AudioClip } from "@/components/AudioClip";
import { Badge, Button, Card, Eyebrow } from "@/components/ui";
import { computeCoverage } from "@/lib/coverage";
import { machineName } from "@/lib/records";
import { MANUAL, expertById, hours } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { useRecords } from "@/hooks/useRecords";

export default function ManualPage() {
  const stories = useStore((s) => s.stories);
  const records = useRecords();
  const cov = useMemo(() => computeCoverage(stories, records), [stories, records]);
  const corrections = stories.flatMap((s) => (s.extraction.manualCorrections ?? []).map((c) => ({ ...c, story: s, code: s.extraction.faultCodes[0] ?? "" })));
  const byCode = new Map<string, typeof corrections>();
  for (const c of corrections) byCode.set(c.code, [...(byCode.get(c.code) ?? []), c]);
  const silent = MANUAL.filter((m) => cov.gaps.some((g) => g.faultCode === m.faultCode));

  return (
    <div className="space-y-5">
      <div>
        <Eyebrow>Manual vs reality</Eyebrow>
        <h1 className="mt-1 text-2xl font-semibold">
          <span className="text-accent">{corrections.length}</span> places where the manual is wrong or incomplete
        </h1>
        <p className="text-muted">Found by comparing each recording with the official manual. This is the knowledge that exists nowhere on paper.</p>
      </div>

      {[...byCode.entries()].map(([code, list]) => {
        const manual = MANUAL.find((m) => m.faultCode === code);
        const stat = cov.faults.find((f) => f.faultCode === code);
        return (
          <Card key={code || "none"} className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-mono text-lg font-semibold text-accent">{code || "No fault code"}</span>{" "}
                <span className="font-medium">{stat?.description}</span>
                <div className="text-xs text-muted">
                  {stat ? machineName(stat.machineId) : ""} {manual ? `· ${manual.source}` : ""}
                </div>
              </div>
              {code && (
                <Link href={`/guides/${code}`}>
                  <Button size="sm">Open guide</Button>
                </Link>
              )}
            </div>
            {list.map((c, i) => (
              <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_auto] md:items-center">
                <div className="rounded-lg border border-line bg-panel2 p-3 text-sm">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted">The manual says</div>
                  <span className="text-muted line-through decoration-bad/60">{c.manualSays}</span>
                </div>
                <div className="rounded-lg border border-accent/40 bg-accent/5 p-3 text-sm">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-accent">{expertById(c.story.expertId)?.name} does</div>
                  {c.expertSays}
                </div>
                <AudioClip story={c.story} label="Proof" />
              </div>
            ))}
          </Card>
        );
      })}
      {corrections.length === 0 && <Card className="text-sm text-muted">No corrections captured yet. Record an expert and they will appear here.</Card>}

      {silent.length > 0 && (
        <Card className="space-y-3 border-bad/30">
          <Eyebrow className="flex items-center gap-1.5 text-bad">
            <BookX className="h-3.5 w-3.5" /> The manual is all we have for these faults
          </Eyebrow>
          {silent.map((m) => {
            const g = cov.gaps.find((x) => x.faultCode === m.faultCode)!;
            return (
              <div key={m.faultCode} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-panel2 p-3">
                <div className="min-w-0 flex-1">
                  <div>
                    <span className="font-mono text-bad">{m.faultCode}</span> {g.description} <Badge tone="neutral">{hours(g.downtimeMin)} downtime</Badge>
                  </div>
                  <div className="text-xs text-muted">
                    {m.source}: {m.says.join(" ")}
                  </div>
                </div>
                <Link href={`/interview?code=${m.faultCode}`}>
                  <Button size="sm">
                    <Mic className="h-4 w-4" /> Interview
                  </Button>
                </Link>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
