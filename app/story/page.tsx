"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Ghost, Wrench } from "lucide-react";
import { computeCoverage, pct } from "@/lib/coverage";
import { FAULT_RECORDS, PRIMARY_EXPERT, daysUntil } from "@/lib/seed";
import { useStore } from "@/lib/store";

type Beat = { key: string; node: React.ReactNode; ms: number };

/** Full-screen opener for the pitch. Click, Space or → advances; it also auto-plays. */
export default function StoryPage() {
  const stories = useStore((s) => s.stories);
  const cov = useMemo(() => computeCoverage(stories), [stories]);
  const record = FAULT_RECORDS.filter((r) => r.faultCode === "E-217").at(-1);
  const days = daysUntil(PRIMARY_EXPERT.retiresOn);
  const [i, setI] = useState(0);

  const beats: Beat[] = [
    {
      key: "years",
      ms: 3200,
      node: (
        <p className="text-4xl font-semibold leading-tight sm:text-6xl">
          {PRIMARY_EXPERT.name} has kept these machines running for <span className="text-accent">{PRIMARY_EXPERT.years} years</span>.
        </p>
      ),
    },
    {
      key: "days",
      ms: 2600,
      node: (
        <p className="text-5xl font-semibold sm:text-7xl">
          He retires in <span className="text-bad">{days} days</span>.
        </p>
      ),
    },
    {
      key: "record",
      ms: 3600,
      node: (
        <div className="space-y-6">
          <p className="text-xl text-muted sm:text-2xl">The fault log says:</p>
          <p className="font-mono text-3xl sm:text-5xl">
            {record?.faultCode} · {record?.description}
            <br />
            <span className="text-accent">&ldquo;{record?.resolutionNote}&rdquo;</span>
          </p>
        </div>
      ),
    },
    {
      key: "never",
      ms: 3000,
      node: <p className="text-4xl font-semibold sm:text-6xl">It never says how he fixed it.</p>,
    },
    {
      key: "risk",
      ms: 3400,
      node: (
        <p className="text-4xl font-semibold leading-tight sm:text-6xl">
          <span className="text-bad">{pct(1 - cov.overall)}</span> of last year&apos;s downtime has no written fix.
        </p>
      ),
    },
    {
      key: "logo",
      ms: 0,
      node: (
        <div className="flex flex-col items-center gap-6">
          <div className="relative grid h-24 w-24 place-items-center rounded-3xl bg-accent/15 text-accent shadow-[0_0_80px_-10px_rgba(255,122,26,0.8)]">
            <Ghost className="h-14 w-14" />
            <Wrench className="absolute -bottom-2 -right-2 h-8 w-8 text-text" />
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
            Ghost<span className="text-accent">Wrench</span>
          </h1>
          <p className="max-w-xl text-xl text-muted">Bottle the expert before they retire. Talk, and it becomes a repair guide anyone can ask.</p>
          <Link
            href="/"
            className="mt-2 rounded-xl bg-accent px-8 py-3 text-lg font-semibold text-black shadow-[0_0_40px_-6px_rgba(255,122,26,0.8)] hover:bg-orange-400"
          >
            Begin →
          </Link>
        </div>
      ),
    },
  ];
  const last = beats.length - 1;

  const next = useCallback(() => setI((x) => Math.min(last, x + 1)), [last]);

  useEffect(() => {
    if (i >= last) return;
    const t = setTimeout(next, beats[i].ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next]);

  return (
    <div className="relative grid min-h-screen cursor-pointer place-items-center overflow-hidden bg-black px-6 text-center" onClick={i < last ? next : undefined}>
      <div className="hazard absolute inset-x-0 top-0 h-1 opacity-80" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,122,26,0.12),transparent_55%)]" />
      <AnimatePresence mode="wait">
        <motion.div
          key={beats[i].key}
          initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative max-w-4xl"
        >
          {beats[i].node}
        </motion.div>
      </AnimatePresence>
      <div className="absolute bottom-6 flex gap-1.5">
        {beats.map((b, k) => (
          <span key={b.key} className={`h-1 rounded-full transition-all ${k === i ? "w-8 bg-accent" : "w-3 bg-line"}`} />
        ))}
      </div>
      {i < last && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setI(last);
          }}
          className="absolute bottom-5 right-6 text-xs text-muted hover:text-text"
        >
          Skip →
        </button>
      )}
    </div>
  );
}
