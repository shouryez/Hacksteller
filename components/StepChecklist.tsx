"use client";
import { useState } from "react";
import { Check, RotateCcw } from "lucide-react";
import { cn } from "./ui";

/** Tap-to-tick procedure for the shop floor, with progress. */
export function StepChecklist({ steps, size = "md" }: { steps: { text: string; meta?: string }[]; size?: "md" | "lg" }) {
  const [done, setDone] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setDone((d) => {
      const n = new Set(d);
      if (n.has(i)) n.delete(i);
      else n.add(i);
      return n;
    });
  const progress = steps.length ? done.size / steps.length : 0;
  return (
    <div>
      <div className="no-print mb-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-ok transition-all duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="text-xs tabular-nums text-muted">
          {done.size}/{steps.length}
        </span>
        {done.size > 0 && (
          <button onClick={() => setDone(new Set())} className="text-muted hover:text-text" aria-label="Reset checklist">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <ol className={cn(size === "lg" ? "space-y-3" : "space-y-2")}>
        {steps.map((s, i) => {
          const on = done.has(i);
          return (
            <li key={i}>
              <button onClick={() => toggle(i)} className="flex w-full gap-3 rounded-lg text-left" aria-pressed={on}>
                <span
                  className={cn(
                    "grid shrink-0 place-items-center rounded-full font-semibold transition-colors",
                    size === "lg" ? "h-8 w-8" : "h-7 w-7 text-sm",
                    on ? "bg-ok text-black" : "bg-ok/15 text-ok",
                  )}
                >
                  {on ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span className={cn("pt-0.5 transition-colors", size === "lg" && "text-lg leading-snug", on && "text-muted line-through decoration-ok/60")}>
                  {s.text}
                  {s.meta && <span className="ml-2 text-xs text-muted no-underline">{s.meta}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {steps.length > 0 && done.size === steps.length && (
        <div className="no-print mt-3 rounded-lg border border-ok/40 bg-ok/10 px-3 py-2 text-sm text-ok">All steps done. Log the fix so the next person learns from it too.</div>
      )}
    </div>
  );
}
