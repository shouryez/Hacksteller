"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { Search } from "lucide-react";
import { Badge, Card, Eyebrow } from "@/components/ui";
import { computeCoverage } from "@/lib/coverage";
import { hours, machineById } from "@/lib/seed";
import { useStore } from "@/lib/store";

export default function GuidesPage() {
  const stories = useStore((s) => s.stories);
  const [q, setQ] = useState("");
  const cov = useMemo(() => computeCoverage(stories), [stories]);

  const docs = useMemo(
    () =>
      cov.faults.map((f) => {
        const linked = stories.filter((s) => f.storyIds.includes(s.id));
        return {
          ...f,
          machine: machineById(f.machineId)?.name ?? f.machineId,
          title: linked[0]?.extraction.title ?? "",
          text: linked
            .map((s) =>
              [
                s.extraction.summary,
                s.extraction.symptoms.map((x) => x.label).join(" "),
                s.extraction.causes.map((x) => x.label).join(" "),
                s.extraction.fixes.map((x) => [x.label, ...x.steps, ...x.tools].join(" ")).join(" "),
                s.extraction.tribalTips.map((x) => x.text).join(" "),
              ].join(" "),
            )
            .join(" "),
        };
      }),
    [cov.faults, stories],
  );

  const fuse = useMemo(
    () =>
      new Fuse(docs, {
        keys: [
          { name: "faultCode", weight: 3 },
          { name: "description", weight: 2 },
          { name: "title", weight: 2 },
          { name: "machine", weight: 1.5 },
          { name: "text", weight: 1 },
        ],
        threshold: 0.4,
        ignoreLocation: true,
      }),
    [docs],
  );
  const results = q.trim() ? fuse.search(q).map((r) => r.item) : docs;

  return (
    <div className="space-y-5">
      <div>
        <Eyebrow className="text-accent/90">Troubleshooting guides</Eyebrow>
        <h1 className="mt-2 text-balance text-3xl font-semibold leading-[1.05] sm:text-4xl">Every fault code, with what the experts actually do.</h1>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search: “coolant”, “whine”, “E-217”, “conveyor drift”…"
          className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-4 outline-none focus:border-accent"
        />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {results.map((f) => (
          <Link key={f.faultCode} href={`/guides/${f.faultCode}`}>
            <Card className="h-full transition-colors hover:border-accent/50">
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg font-semibold">{f.faultCode}</span>
                {f.covered ? <Badge tone="ok">Captured · {f.storyIds.length}</Badge> : <Badge tone="bad">Knowledge gap</Badge>}
              </div>
              <div className="mt-1 font-medium">{f.description}</div>
              <div className="text-xs text-muted">
                {f.machine} · {f.occurrences}× · {hours(f.downtimeMin)} downtime
              </div>
              {f.title && <div className="mt-3 text-sm text-text/80">&ldquo;{f.title}&rdquo;</div>}
            </Card>
          </Link>
        ))}
        {results.length === 0 && <p className="mt-2 text-muted">No matches.</p>}
      </div>
    </div>
  );
}
