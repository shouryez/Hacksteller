"use client";
import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertOctagon, ArrowRight, BadgeCheck, BookX, CalendarClock, FileScan, FileText, GraduationCap, Mic, Quote, Siren } from "lucide-react";
import { CoverageRing } from "@/components/CoverageRing";
import { Badge, Button, Card, Eyebrow, Stat } from "@/components/ui";
import { computeCoverage, pct } from "@/lib/coverage";
import { computeImpact, inr } from "@/lib/impact";
import { PRIMARY_EXPERT, daysUntil, hours, machineById } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { useAlarm } from "@/lib/alarm";
import { useRecords } from "@/hooks/useRecords";

export default function RadarPage() {
  const stories = useStore((s) => s.stories);
  const queue = useStore((s) => s.queue);
  const records = useRecords();
  const raiseAlarm = useAlarm((s) => s.raise);
  const cov = useMemo(() => computeCoverage(stories, records), [stories, records]);
  const impact = useMemo(() => computeImpact(stories, records), [stories, records]);
  const costPerHour = useStore((s) => s.costPerHour);
  const setCostPerHour = useStore((s) => s.setCostPerHour);
  const days = daysUntil(PRIMARY_EXPERT.retiresOn);
  const rajuStories = stories.filter((s) => s.expertId === PRIMARY_EXPERT.id).length;
  const initials = PRIMARY_EXPERT.name
    .split(" ")
    .map((w) => w[0])
    .join("");

  const contrast = useMemo(() => {
    const story = stories.find((s) => s.extraction.tribalTips.length && s.extraction.faultCodes.length);
    if (!story) return null;
    const code = story.extraction.faultCodes[0];
    const record = records.filter((r) => r.faultCode === code && !r.viaGuide).at(-1);
    return record ? { record, tip: story.extraction.tribalTips[0], code } : null;
  }, [stories, records]);
  const alarmDemo = cov.faults.find((f) => f.covered);

  return (
    <div className="space-y-6">
      {/* Hero band */}
      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <Card className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-cool/10 blur-3xl" />
          <Eyebrow className="text-accent">Knowledge at risk</Eyebrow>
          <div className="mt-4 flex flex-wrap items-center gap-5">
            <div className="relative grid h-20 w-20 place-items-center rounded-2xl border border-accent/40 bg-gradient-to-br from-accent/30 to-transparent font-display text-2xl font-bold">
              {initials}
              <span className="absolute -inset-1 -z-10 rounded-[20px] bg-accent/20 blur-md" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold">{PRIMARY_EXPERT.name}</h1>
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
          <p className="mt-6 max-w-xl text-balance text-xl leading-snug text-text/90">
            Factory records say <span className="text-accent">what</span> broke. They never say <span className="text-accent">how</span> it was fixed. When Raju leaves,{" "}
            <span className="font-semibold text-bad">{pct(1 - cov.overall)}</span> of last year&apos;s downtime has no written fix.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={cov.gaps[0] ? `/interview?code=${cov.gaps[0].faultCode}` : "/interview"}>
              <Button variant="primary" size="lg">
                <Mic className="h-4 w-4" /> Interview Raju about the biggest gap
              </Button>
            </Link>
            <Link href="/ask">
              <Button size="lg">Ask the Ghost</Button>
            </Link>
            {alarmDemo && (
              <Button variant="ghost" size="lg" onClick={() => raiseAlarm(alarmDemo.faultCode, alarmDemo.machineId)} title="Simulate a machine raising an alarm right now">
                <Siren className="h-4 w-4 text-bad" /> Simulate a live alarm
              </Button>
            )}
          </div>
        </Card>

        <Card className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:justify-around">
          <CoverageRing value={cov.overall} label="of downtime has a captured fix" />
          <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-1 sm:text-left">
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
                <div className="mb-1.5 flex justify-between text-sm">
                  <span>{machineById(m.machineId)?.name}</span>
                  <span className="font-mono text-xs tabular-nums text-muted">{pct(m.coverage)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: m.coverage >= 0.75 ? "linear-gradient(90deg,#16a34a,#22c55e)" : m.coverage >= 0.5 ? "linear-gradient(90deg,#ca8a04,#facc15)" : "linear-gradient(90deg,#b91c1c,#ef4444)",
                      boxShadow: `0 0 12px ${m.coverage >= 0.75 ? "#22c55e66" : m.coverage >= 0.5 ? "#facc1566" : "#ef444466"}`,
                    }}
                    initial={false}
                    animate={{ width: `${Math.max(3, m.coverage * 100)}%` }}
                    transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
                  />
                </div>
              </div>
            ))}
          </div>
          {contrast && (
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
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
              <div className="glass-accent rounded-xl border p-3">
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
                className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 transition-colors hover:border-bad/40"
              >
                <div className="grid h-10 w-16 place-items-center rounded-lg border border-dashed border-bad/60 bg-bad/10 font-mono text-sm text-bad">{g.faultCode}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{g.description}</div>
                  <div className="text-xs text-muted">
                    {machineById(g.machineId)?.name} · {g.occurrences}× in 12 months · {hours(g.downtimeMin)} downtime · records say &ldquo;{g.notes.at(-1)}&rdquo;
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

      <Card>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Why it matters</Eyebrow>
            <h2 className="mt-1 text-xl font-semibold">What Raju&apos;s captured knowledge is worth</h2>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            Assumed cost of 1 h downtime ₹
            <input
              type="number"
              min={0}
              step={1000}
              value={costPerHour}
              onChange={(e) => setCostPerHour(Math.max(0, Number(e.target.value) || 0))}
              className="h-9 w-28 rounded-lg border border-white/10 bg-white/[0.04] px-2 font-mono text-sm text-text outline-none focus:border-accent"
            />
          </label>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="glass-ok rounded-xl border p-4">
            <div className="font-display text-3xl font-semibold tabular-nums text-ok">{hours(impact.savedMin)}/yr</div>
            <div className="text-sm text-muted">downtime avoidable with captured fixes</div>
            <div className="mt-1 text-lg font-medium tabular-nums">≈ {inr((impact.savedMin / 60) * costPerHour)}</div>
          </div>
          <div className="glass-bad rounded-xl border p-4">
            <div className="font-display text-3xl font-semibold tabular-nums text-bad">{hours(impact.atRiskMin)}/yr</div>
            <div className="text-sm text-muted">downtime with no fix on record</div>
            <div className="mt-1 text-lg font-medium tabular-nums">≈ {inr((impact.atRiskMin / 60) * costPerHour)} at risk</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm">
            <Eyebrow className="mb-2">Biggest wins</Eyebrow>
            {impact.perFault.slice(0, 3).map((f) => (
              <div key={f.faultCode} className="flex justify-between gap-2 py-0.5">
                <span>
                  <span className="font-mono text-accent">{f.faultCode}</span> {Math.round(f.avgDowntimeMin)} → {f.fixMin} min
                </span>
                <span className="font-mono tabular-nums text-muted">{hours(f.savedMin)}</span>
              </div>
            ))}
            {impact.perFault.length === 0 && <div className="text-muted">Capture a fix to see savings.</div>}
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Avoidable downtime = (average recorded downtime − the expert&apos;s stated fix time) × occurrences over the last 12 months. The cost per hour is your assumption.
          {impact.confirmedFixes > 0 && (
            <span className="ml-1 text-ok">
              <BadgeCheck className="mb-0.5 inline h-3.5 w-3.5" /> {impact.confirmedFixes} fix{impact.confirmedFixes > 1 ? "es" : ""} already confirmed in the field, saving {hours(impact.confirmedSavedMin)}.
            </span>
          )}
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { href: "/manual", icon: BookX, title: "Manual vs reality", body: `${stories.reduce((a, s) => a + (s.extraction.manualCorrections?.length ?? 0), 0)} places where the experts correct the official manual.` },
          { href: "/drill", icon: GraduationCap, title: "Apprentice drill", body: "The ghost quizzes juniors on the captured knowledge. Try it yourself." },
          { href: "/report", icon: FileScan, title: "Handover report", body: "One printable page for HR and the maintenance head, generated live." },
        ].map((c) => (
          <Link key={c.href} href={c.href}>
            <Card hover className="group h-full">
              <div className="flex items-center justify-between">
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-accent group-hover:border-accent/40 group-hover:bg-accent/10">
                  <c.icon className="h-4.5 w-4.5" />
                </span>
                <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-text" />
              </div>
              <div className="mt-3 font-semibold">{c.title}</div>
              <p className="text-sm text-muted">{c.body}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
