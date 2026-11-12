"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Printer } from "lucide-react";
import { Button, Eyebrow } from "@/components/ui";
import { computeCoverage, pct } from "@/lib/coverage";
import { buildGuide } from "@/lib/guide";
import { computeImpact, inr } from "@/lib/impact";
import { machineName } from "@/lib/records";
import { PRIMARY_EXPERT, daysUntil, expertById, hours } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { useRecords } from "@/hooks/useRecords";

/** Printable knowledge-handover report for the retiring expert. */
export default function ReportPage() {
  const stories = useStore((s) => s.stories);
  const costPerHour = useStore((s) => s.costPerHour);
  const queue = useStore((s) => s.queue);
  const records = useRecords();
  const cov = useMemo(() => computeCoverage(stories, records), [stories, records]);
  const impact = useMemo(() => computeImpact(stories, records), [stories, records]);
  const expert = PRIMARY_EXPERT;
  const mine = stories.filter((s) => s.expertId === expert.id);
  const tips = stories.reduce((a, s) => a + s.extraction.tribalTips.length, 0);
  const corrections = stories.reduce((a, s) => a + (s.extraction.manualCorrections?.length ?? 0), 0);
  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <Eyebrow>Handover report</Eyebrow>
          <p className="text-muted">One page for the maintenance head and HR: what has been captured, what is still only in {expert.name.split(" ")[0]}&apos;s head.</p>
        </div>
        <Button variant="primary" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / save as PDF
        </Button>
      </div>

      <article className="report mx-auto max-w-4xl rounded-xl bg-white p-8 text-[13px] leading-relaxed text-black shadow-2xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-black pb-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Knowledge handover report</div>
            <h1 className="mt-1 text-3xl font-bold">{expert.name}</h1>
            <div className="text-neutral-600">
              {expert.role} · {expert.years} years of service
            </div>
          </div>
          <div className="text-right text-neutral-600">
            <div>Generated {today}</div>
            <div>
              Last working day: <b className="text-black">{new Date(expert.retiresOn).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</b>
            </div>
            <div className="font-semibold text-red-700">{daysUntil(expert.retiresOn)} days remaining</div>
          </div>
        </header>

        <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Num value={pct(cov.overall)} label="of last year's downtime now has a recorded fix" />
          <Num value={`${cov.coveredCount}/${cov.faults.length}`} label="fault codes covered" />
          <Num value={String(mine.length)} label={`recordings by ${expert.name.split(" ")[0]} (${stories.length} in total)`} />
          <Num value={String(corrections)} label={`corrections to the manuals, ${tips} tribal tips`} />
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-base font-bold">1. Knowledge captured</h2>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-400 text-[11px] uppercase tracking-wider text-neutral-500">
                <th className="py-1.5 pr-2">Fault</th>
                <th className="py-1.5 pr-2">Machine</th>
                <th className="py-1.5 pr-2">What the expert does</th>
                <th className="py-1.5 pr-2">Source</th>
                <th className="py-1.5 text-right">Fix time</th>
              </tr>
            </thead>
            <tbody>
              {cov.faults
                .filter((f) => f.covered)
                .map((f) => {
                  const guide = buildGuide(f.faultCode, stories);
                  const first = stories.find((s) => s.id === f.storyIds[0]);
                  return (
                    <tr key={f.faultCode} className="border-b border-neutral-200 align-top">
                      <td className="py-1.5 pr-2 font-mono font-semibold">{f.faultCode}</td>
                      <td className="py-1.5 pr-2">{machineName(f.machineId)}</td>
                      <td className="py-1.5 pr-2">{first?.extraction.title}</td>
                      <td className="py-1.5 pr-2">{f.expertIds.map((id) => expertById(id)?.name.split(" ")[0]).join(", ")}</td>
                      <td className="py-1.5 text-right tabular-nums">~{guide?.estMinutes} min</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-base font-bold">2. Still at risk: capture before the last working day</h2>
          {cov.gaps.length === 0 ? (
            <p>Every fault in the log has a recorded fix.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-400 text-[11px] uppercase tracking-wider text-neutral-500">
                  <th className="py-1.5 pr-2">Fault</th>
                  <th className="py-1.5 pr-2">Machine</th>
                  <th className="py-1.5 pr-2">Description</th>
                  <th className="py-1.5 pr-2 text-right">Occurrences</th>
                  <th className="py-1.5 text-right">Downtime</th>
                </tr>
              </thead>
              <tbody>
                {cov.gaps.map((g) => (
                  <tr key={g.faultCode} className="border-b border-neutral-200">
                    <td className="py-1.5 pr-2 font-mono font-semibold text-red-700">{g.faultCode}</td>
                    <td className="py-1.5 pr-2">{machineName(g.machineId)}</td>
                    <td className="py-1.5 pr-2">{g.description}</td>
                    <td className="py-1.5 pr-2 text-right tabular-nums">{g.occurrences}</td>
                    <td className="py-1.5 text-right tabular-nums">{hours(g.downtimeMin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
          {queue.length > 0 && <p className="mt-2 text-neutral-600">{queue.length} question(s) from junior technicians are also waiting for an answer.</p>}
          {cov.singleExpert.length > 0 && (
            <p className="mt-2 text-neutral-600">
              Single point of failure: {cov.singleExpert.map((f) => f.faultCode).join(", ")} {cov.singleExpert.length === 1 ? "is" : "are"} documented only from {expert.name.split(" ")[0]}&apos;s
              recordings. Have a second technician confirm them in the field.
            </p>
          )}
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-base font-bold">3. Business impact</h2>
          <ul className="list-inside list-disc space-y-0.5">
            <li>
              Downtime avoidable with the captured fixes: <b>{hours(impact.savedMin)} per year</b> (about {inr((impact.savedMin / 60) * costPerHour)} at {inr(costPerHour)} per downtime hour).
            </li>
            <li>
              Downtime with no fix on record: <b>{hours(impact.atRiskMin)} per year</b> (about {inr((impact.atRiskMin / 60) * costPerHour)} at risk).
            </li>
            <li>
              Fixes confirmed in the field through a guide: <b>{impact.confirmedFixes}</b>
              {impact.confirmedFixes > 0 && <> , saving {hours(impact.confirmedSavedMin)} against the usual repair time</>}.
            </li>
          </ul>
          <p className="mt-1 text-[11px] text-neutral-500">
            Avoidable downtime = (average recorded downtime − the expert&apos;s stated fix time) × occurrences in the last 12 months. The cost per hour is an assumption set on the Risk Radar.
          </p>
        </section>

        <section className="mt-10 grid grid-cols-3 gap-8 text-center text-[11px] text-neutral-600">
          {[expert.name, "Maintenance head", "HR / plant manager"].map((who) => (
            <div key={who}>
              <div className="h-10 border-b border-neutral-500" />
              <div className="mt-1">{who}</div>
            </div>
          ))}
        </section>
        <footer className="mt-6 text-center text-[10px] text-neutral-400">Generated by GhostWrench from recorded explanations and the plant fault log.</footer>
      </article>
      <p className="no-print text-center text-xs text-muted">
        Numbers update live as you record. <Link href="/" className="underline">Back to the Risk Radar</Link>
      </p>
    </div>
  );
}

function Num({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-lg border border-neutral-300 p-3">
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[11px] leading-tight text-neutral-600">{label}</div>
    </div>
  );
}
