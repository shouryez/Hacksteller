"use client";
import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertOctagon, ArrowRight, CalendarClock, FileText, Mic, Quote } from "lucide-react";
import { CoverageRing } from "@/components/CoverageRing";
import { Badge, Button, Card, Eyebrow } from "@/components/ui";
import { computeCoverage, pct } from "@/lib/coverage";
import { FAULT_RECORDS, PRIMARY_EXPERT, daysUntil, hours, machineById } from "@/lib/seed";
import { useStore } from "@/lib/store";

export default function RadarPage() {
  const stories = useStore((s) => s.stories);
  const queue = useStore((s) => s.queue);
  const cov = useMemo(() => computeCoverage(stories), [stories]);
  const days = daysUntil(PRIMARY_EXPERT.retiresOn);
  const rajuStories = stories.filter((s) => s.expertId === PRIMARY_EXPERT.id).length;

  const contrast = useMemo(() => {
    const story = stories.find((s) => s.extraction.tribalTips.length && s.extraction.faultCodes.length);
    if (!story) return null;
    const code = story.extraction.faultCodes[0];
    const record = FAULT_RECORDS.filter((r) => r.faultCode === code).at(-1);
    return record ? { record, tip: story.extraction.tribalTips[0], code } : null;
  }, [stories]);

  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Card className="relative overflow-hidden">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
          <Eyebrow>Knowledge at risk</Eyebrow>
          <div className="mt-4 flex flex-wrap items-center gap-5">
            <div className="grid h-20 w-20 place-items-center rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/30 to-transparent text-2xl font-bold">
              RG
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{PRIMARY_EXPERT.name}</h1>
              <p className="text-muted">
                {PRIMARY_EXPERT.role} · {PRIMARY_EXPERT.years} years on these machines
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="bad">
                  <CalendarClock className="h-3.5 w-3.5" /> Retires in {days} days
                </Badge>
                <Badge tone="accent">{rajuStories} stories captured</Badge>
                <Badge tone="neutral">{queue.length} questions waiting</Badge>
              </div>
            </div>
          </div>
          <p className="mt-5 max-w-xl text-lg leading-snug text-text/90">
            Factory records say <span className="text-accent">what</span> broke. They never say <span className="text-accent">how</span> it was
            fixed. When Raju leaves, {pct(1 - cov.overall)} of last year&apos;s downtime has no written fix.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={cov.gaps[0] ? `/interview?code=${cov.gaps[0].faultCode}` : "/interview"}>
              <Button variant="primary">
                <Mic className="h-4 w-4" /> Interview Raju about the biggest gap
              </Button>
            </Link>
            <Link href="/ask">
              <Button>Ask the Ghost</Button>
            </Link>
          </div>
        </Card>

        <Card className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-around">
          <CoverageRing value={cov.overall} label="of downtime has a captured fix" />
          <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-1 sm:text-left">
            <Stat label="Fault codes covered" value={`${cov.coveredCount}/${cov.faults.length}`} />
            <Stat label="Downtime at risk" value={hours(cov.atRiskMin)} tone="bad" />
            <Stat label="Only Raju knows" value={`${cov.singleExpert.length} faults`} tone="warn" />
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <Eyebrow>Coverage by machine</Eyebrow>
          <div className="mt-4 space-y-4">
            {cov.byMachine.map((m) => (
              <div key={m.machineId}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{machineById(m.machineId)?.name}</span>
                  <span className="tabular-nums text-muted">{pct(m.coverage)}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-line">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: m.coverage >= 0.75 ? "#22c55e" : m.coverage >= 0.5 ? "#facc15" : "#ef4444" }}
                    initial={false}
                    animate={{ width: `${Math.max(3, m.coverage * 100)}%` }}
                    transition={{ duration: 1 }}
                  />
                </div>
              </div>
            ))}
          </div>
          {contrast && (
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-line bg-panel2 p-3">
                <Eyebrow className="flex items-center gap-1">
                  <FileText className="h-3 w-3" /> The records say
                </Eyebrow>
                <div className="mt-2 font-mono text-xs text-muted">
                  {contrast.record.recordId} · {contrast.record.date}
                  <br />
                  {contrast.record.faultCode} {contrast.record.description}
                </div>
                <div className="mt-2 font-mono text-sm">&ldquo;{contrast.record.resolutionNote}&rdquo;</div>
              </div>
              <div className="rounded-lg border border-accent/40 bg-accent/5 p-3">
                <Eyebrow className="flex items-center gap-1 text-accent">
                  <Quote className="h-3 w-3" /> Raju says
                </Eyebrow>
                <div className="mt-2 text-sm italic">&ldquo;{contrast.tip.quote}&rdquo;</div>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <Eyebrow className="flex items-center gap-1.5">
              <AlertOctagon className="h-3.5 w-3.5 text-bad" /> Knowledge gaps, ranked by downtime
            </Eyebrow>
            <Link href="/guides" className="text-xs text-muted hover:text-text">
              All fault codes →
            </Link>
          </div>
          <div className="mt-4 space-y-2">
            {cov.gaps.length === 0 && <p className="text-sm text-ok">Every recorded fault has a captured fix. 🎉</p>}
            {cov.gaps.map((g, i) => (
              <motion.div
                key={g.faultCode}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-panel2 p-3"
              >
                <div className="grid h-10 w-16 place-items-center rounded-md border border-dashed border-bad/60 bg-bad/10 font-mono text-sm text-bad">
                  {g.faultCode}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{g.description}</div>
                  <div className="text-xs text-muted">
                    {machineById(g.machineId)?.name} · {g.occurrences}× in 12 months · {hours(g.downtimeMin)} downtime · records say &ldquo;
                    {g.notes.at(-1)}&rdquo;
                  </div>
                </div>
                <Link href={`/interview?code=${g.faultCode}`}>
                  <Button size="sm" variant={i === 0 ? "primary" : "outline"}>
                    Interview <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bad" | "warn" }) {
  return (
    <div>
      <div className={`text-2xl font-semibold tabular-nums ${tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : ""}`}>{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
