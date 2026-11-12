"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "./ui";

const STEPS = [
  { href: "/story", match: "/story", title: "Hook", cue: "34 years. 23 days. “Reset ok.” Let the intro play, then click Begin." },
  { href: "/", match: "/", title: "Risk Radar", cue: "Coverage ~half. Point at E-311 (9×, 33 h, “called Raju, fixed”) and the ₹ at risk." },
  { href: "/interview?code=E-311", match: "/interview", title: "Interview Raju", cue: "Ask aloud → Raju answers (or Rehearsed demo story). Graph grows, coverage jumps, completeness check follows up." },
  { href: "/faults", match: "/faults", title: "Live alarm", cue: "Simulate E-311 → siren → the ghost answers the alarm with Raju’s fix before anyone picks up a phone." },
  { href: "/ask", match: "/ask", title: "Ask the Ghost", cue: "“Machine four is getting hot…” → spoken answer + Raju’s clip. Then “tool changer…” → honest refusal." },
  { href: "/guides/E-311", match: "/guides", title: "Guide + QR + log fix", cue: "Manual vs expert side by side. Tick the steps, log the fix → the fault record finally says HOW. QR for judges." },
  { href: "/drill", match: "/drill", title: "Drill (judge plays)", cue: "Hand a judge the mouse: “Would you fix it like Raju?” Manual traps included." },
  { href: "/report", match: "/report", title: "Close", cue: "The handover report. “Every factory has a Raju. His last day shouldn’t be the day his knowledge dies.”" },
];

export function PresenterPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const current = STEPS.findIndex((s) => (s.match === "/" ? pathname === "/" : pathname.startsWith(s.match)));
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="no-print fixed bottom-4 left-4 z-50 w-[min(92vw,330px)] rounded-xl border border-accent/40 bg-panel2/95 p-4 shadow-2xl backdrop-blur"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Presenter · 3 min</div>
            <button onClick={onClose} className="text-muted hover:text-text" aria-label="Close presenter cue-card">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ol className="space-y-1.5">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <Link
                  href={s.href}
                  className={cn(
                    "block rounded-lg border px-3 py-2 text-sm transition-colors",
                    i === current ? "border-accent/60 bg-accent/10" : "border-transparent hover:border-line",
                  )}
                >
                  <span className={cn("font-medium", i === current ? "text-accent" : "text-text")}>
                    {i + 1}. {s.title}
                  </span>
                  {i === current && <span className="mt-0.5 block text-xs leading-snug text-muted">{s.cue}</span>}
                </Link>
              </li>
            ))}
          </ol>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
