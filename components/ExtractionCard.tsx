"use client";
import Link from "next/link";
import { AlertTriangle, Lightbulb, Wrench } from "lucide-react";
import { expertById, machineById } from "@/lib/seed";
import type { Source, Story } from "@/lib/types";
import { AudioClip } from "./AudioClip";
import { Badge, Card, Eyebrow, SourceBadge } from "./ui";

export function ExtractionCard({ story, source }: { story: Story; source?: Source }) {
  const x = story.extraction;
  const expert = expertById(story.expertId);
  const machine = machineById(story.machineId);
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Eyebrow>
            {machine?.name} · {expert?.name}
          </Eyebrow>
          <h3 className="mt-1 text-lg font-semibold">{x.title}</h3>
          <p className="mt-1 text-sm text-muted">{x.summary}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {x.faultCodes.map((c) => (
            <Link key={c} href={`/guides/${c}`}>
              <Badge tone="accent">{c}</Badge>
            </Link>
          ))}
          <Badge tone={x.confidence === "high" ? "ok" : x.confidence === "medium" ? "warn" : "bad"}>{x.confidence} confidence</Badge>
          <SourceBadge source={source} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Column title="Symptoms" color="text-warn" items={x.symptoms.map((s) => s.label)} />
        <Column title="Causes" color="text-purple-300" items={x.causes.map((c) => c.label)} />
        <Column title="Fixes" color="text-ok" items={x.fixes.map((f) => `${f.label} · ~${f.estMinutes} min`)} />
      </div>

      {x.fixes.some((f) => f.safety.length) && (
        <div className="rounded-lg border border-bad/30 bg-bad/5 p-3 text-sm">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-bad">
            <AlertTriangle className="h-4 w-4" /> Safety
          </div>
          <ul className="list-inside list-disc text-text/90">
            {[...new Set(x.fixes.flatMap((f) => f.safety))].map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      {x.fixes.length > 0 && (
        <div className="space-y-2">
          {x.fixes.map((f) => (
            <div key={f.id} className="rounded-lg border border-line bg-panel2 p-3">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Wrench className="h-4 w-4 text-ok" /> {f.label}
              </div>
              <ol className="mt-1 list-inside list-decimal text-sm text-text/85">
                {f.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
              {f.tools.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {f.tools.map((t) => (
                    <Badge key={t} tone="info">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {x.tribalTips.length > 0 && (
        <div className="space-y-2">
          <Eyebrow className="flex items-center gap-1.5 text-accent">
            <Lightbulb className="h-3.5 w-3.5" /> Tribal knowledge (not in any manual)
          </Eyebrow>
          {x.tribalTips.map((t, i) => (
            <blockquote key={i} className="rounded-lg border-l-2 border-accent bg-accent/5 px-3 py-2 text-sm">
              <div className="font-medium">{t.text}</div>
              <div className="mt-0.5 italic text-muted">&ldquo;{t.quote}&rdquo;</div>
            </blockquote>
          ))}
        </div>
      )}
      <AudioClip story={story} />
    </Card>
  );
}

function Column({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel2 p-3">
      <div className={`mb-1 text-xs font-semibold uppercase tracking-wider ${color}`}>{title}</div>
      {items.length ? (
        <ul className="space-y-1 text-sm">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-muted">None mentioned</div>
      )}
    </div>
  );
}
