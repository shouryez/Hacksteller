"use client";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { BadgeCheck, Download, FileWarning, Search, Siren, Upload } from "lucide-react";
import { Badge, Button, Card, Eyebrow, cn } from "@/components/ui";
import { useAlarm } from "@/lib/alarm";
import { computeCoverage, pct } from "@/lib/coverage";
import { machineName, machinesFor, parseFaultCsv } from "@/lib/records";
import { expertById, hours } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { toast } from "@/lib/toast";
import { useRecords } from "@/hooks/useRecords";

export default function FaultsPage() {
  const records = useRecords();
  const stories = useStore((s) => s.stories);
  const addRecords = useStore((s) => s.addRecords);
  const raise = useAlarm((s) => s.raise);
  const [machine, setMachine] = useState("");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [q, setQ] = useState("");
  const [showAll, setShowAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cov = useMemo(() => computeCoverage(stories, records), [stories, records]);
  const byCode = useMemo(() => new Map(cov.faults.map((f) => [f.faultCode, f])), [cov]);
  const [alarmCode, setAlarmCode] = useState("");
  const alarmTarget = byCode.get(alarmCode) ?? cov.faults[0];

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...records]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((r) => !machine || r.machineId === machine)
      .filter((r) => !onlyGaps || !byCode.get(r.faultCode)?.covered)
      .filter((r) => !needle || `${r.faultCode} ${r.description} ${r.technician} ${r.resolutionNote} ${r.machineId}`.toLowerCase().includes(needle));
  }, [records, machine, onlyGaps, q, byCode]);

  const linkedCount = records.filter((r) => byCode.get(r.faultCode)?.covered).length;
  const confirmed = records.filter((r) => r.viaGuide).length;
  const totalMin = records.reduce((a, r) => a + r.downtimeMin, 0);

  async function importCsv(file: File) {
    const { records: parsed, errors } = parseFaultCsv(await file.text());
    if (!parsed.length) {
      toast("Couldn't import that file", { tone: "bad", description: errors[0] ?? "No valid rows found." });
      return;
    }
    const added = addRecords(parsed);
    const codes = new Set(parsed.map((r) => r.faultCode));
    const covered = [...codes].filter((c) => stories.some((s) => s.extraction.faultCodes.includes(c))).length;
    toast(`Imported ${added} fault records`, {
      description: `${codes.size} fault codes, ${covered} already have an expert fix.${errors.length ? ` ${errors.length} rows skipped.` : ""}`,
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow className="text-accent/90">Fault log</Eyebrow>
          <h1 className="mt-2 text-balance text-3xl font-semibold leading-[1.05] sm:text-4xl">Every machine fault, linked to what the experts know</h1>
          <p className="mt-2 text-muted">The log records what broke. GhostWrench attaches how it was actually fixed.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && void importCsv(e.target.files[0])} />
          <a href="/fault_records.csv" download>
            <Button size="sm" variant="ghost">
              <Download className="h-4 w-4" /> Sample CSV
            </Button>
          </a>
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import fault log (CSV)
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Fault records" value={String(records.length)} sub={`${hours(totalMin)} total downtime`} />
        <Tile label="Linked to an expert fix" value={pct(records.length ? linkedCount / records.length : 0)} sub={`${linkedCount} of ${records.length} incidents`} tone="ok" />
        <Tile label="Fault codes with no fix" value={String(cov.gaps.length)} sub={`${hours(cov.atRiskMin)} of downtime`} tone="bad" />
        <Tile label="Fixes confirmed in the field" value={String(confirmed)} sub="logged through a guide" tone={confirmed ? "ok" : undefined} />
      </div>

      <Card className="flex flex-wrap items-center gap-3 border-bad/30 bg-bad/5">
        <Siren className="h-5 w-5 text-bad" />
        <div className="min-w-0 flex-1 text-sm">
          <span className="font-medium">What happens when a machine faults right now?</span>{" "}
          <span className="text-muted">Trigger an alarm and watch the expert&apos;s fix arrive before anyone picks up the phone.</span>
        </div>
        <select
          value={alarmTarget?.faultCode ?? ""}
          onChange={(e) => setAlarmCode(e.target.value)}
          className="h-10 max-w-full min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm outline-none focus:border-accent sm:flex-none"
          aria-label="Fault to simulate"
        >
          {cov.faults.map((f) => (
            <option key={f.faultCode} value={f.faultCode}>
              {f.faultCode} · {machineName(f.machineId)} {f.covered ? "" : "(no fix on file)"}
            </option>
          ))}
        </select>
        <Button variant="danger" disabled={!alarmTarget} onClick={() => alarmTarget && raise(alarmTarget.faultCode, alarmTarget.machineId)}>
          <Siren className="h-4 w-4" /> Simulate alarm
        </Button>
      </Card>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search code, description, technician, note…"
            className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-9 pr-3 text-sm outline-none focus:border-accent"
          />
        </div>
        {[{ id: "", name: "All machines" }, ...machinesFor(records)].map((m) => (
          <button
            key={m.id || "all"}
            onClick={() => setMachine(m.id)}
            className={cn("h-10 rounded-xl border px-3 text-xs", machine === m.id ? "border-accent bg-accent/10 text-accent" : "border-white/10 text-muted hover:text-text")}
          >
            {m.id || m.name}
          </button>
        ))}
        <button
          onClick={() => setOnlyGaps((v) => !v)}
          className={cn("h-10 rounded-xl border px-3 text-xs", onlyGaps ? "border-bad bg-bad/10 text-bad" : "border-white/10 text-muted hover:text-text")}
        >
          Only gaps
        </button>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-white/10 text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-3 py-3 font-semibold">Machine</th>
                <th className="px-3 py-3 font-semibold">Fault</th>
                <th className="px-3 py-3 text-right font-semibold">Downtime</th>
                <th className="px-3 py-3 font-semibold">The log says</th>
                <th className="px-4 py-3 font-semibold">What the expert knows</th>
              </tr>
            </thead>
            <tbody>
              {(showAll ? rows : rows.slice(0, 25)).map((r) => {
                const f = byCode.get(r.faultCode);
                const story = f?.covered ? stories.find((s) => s.id === f.storyIds[0]) : undefined;
                return (
                  <tr key={r.recordId} className="border-b border-white/5 last:border-0 hover:bg-white/[0.04]">
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted">{r.date}</td>
                    <td className="px-3 py-2.5">{r.machineId}</td>
                    <td className="px-3 py-2.5">
                      <Link href={`/guides/${r.faultCode}`} className="font-mono text-accent hover:underline">
                        {r.faultCode}
                      </Link>{" "}
                      <span className="text-muted">{r.description}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">{r.downtimeMin} min</td>
                    <td className="max-w-[240px] px-3 py-2.5">
                      {r.viaGuide ? (
                        <span className="inline-flex items-start gap-1 text-xs text-ok">
                          <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {r.resolutionNote}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-muted">&ldquo;{r.resolutionNote || "—"}&rdquo;</span>
                      )}
                      <div className="text-[11px] text-muted">{r.technician}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      {story ? (
                        <Link href={`/guides/${r.faultCode}`} className="group block">
                          <span className="group-hover:underline">{story.extraction.title}</span>
                          <span className="block text-[11px] text-muted">
                            {expertById(story.expertId)?.name} · {f?.storyIds.length} recording{f && f.storyIds.length > 1 ? "s" : ""}
                          </span>
                        </Link>
                      ) : (
                        <Link href={`/interview?code=${r.faultCode}`} className="inline-flex items-center gap-1.5 text-bad hover:underline">
                          <FileWarning className="h-4 w-4" /> No fix on file · interview
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    No records match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {rows.length > 25 && (
          <div className="border-t border-white/10 p-3 text-center">
            <button onClick={() => setShowAll((v) => !v)} className="text-sm text-muted hover:text-text">
              {showAll ? "Show fewer" : `Show all ${rows.length} records`}
            </button>
          </div>
        )}
      </Card>
      <p className="text-xs text-muted">
        CSV columns: <span className="font-mono">date, machineId, faultCode, description, downtimeMin, technician, resolutionNote</span>. Imported records are linked to
        recordings by fault code and immediately change coverage, gaps and interview questions. <Badge tone="neutral">stored in this browser</Badge>
      </p>
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "ok" | "bad" }) {
  return (
    <Card className="p-4">
      <div className={cn("text-3xl font-semibold tabular-nums", tone === "ok" && "text-ok", tone === "bad" && "text-bad")}>{value}</div>
      <div className="text-sm">{label}</div>
      <div className="text-xs text-muted">{sub}</div>
    </Card>
  );
}
