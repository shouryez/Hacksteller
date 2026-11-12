"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BookX,
  Brain,
  FileText,
  Ghost,
  GraduationCap,
  Languages,
  Mic,
  Network,
  Play,
  QrCode,
  Radar,
  ShieldCheck,
  Siren,
  Sparkles,
  Volume2,
  Wrench,
} from "lucide-react";
import { Logo } from "@/components/AppShell";
import { AudioClip } from "@/components/AudioClip";
import { CoverageRing } from "@/components/CoverageRing";
import { GraphLegend, KnowledgeGraph } from "@/components/KnowledgeGraph";
import { Badge, Button, Card, Eyebrow, Input, cn } from "@/components/ui";
import { computeCoverage, pct } from "@/lib/coverage";
import { buildGraph } from "@/lib/graph";
import { computeImpact, inr } from "@/lib/impact";
import { offlineAsk } from "@/lib/offline";
import { FAULT_RECORDS, LIVE_DEMO, MANUAL, PRIMARY_EXPERT, daysUntil, expertById, faultStats, hours, machineById } from "@/lib/seed";
import { useStore } from "@/lib/store";
import { useRecords } from "@/hooks/useRecords";
import type { AskResult } from "@/lib/types";

const Constellation = dynamic(() => import("@/components/landing/Constellation").then((m) => m.Constellation), { ssr: false });

const EASE = [0.2, 0.8, 0.2, 1] as const;
const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.7, ease: EASE },
};

export default function LandingPage() {
  const stories = useStore((s) => s.stories);
  const records = useRecords();
  const cov = useMemo(() => computeCoverage(stories, records), [stories, records]);
  const impact = useMemo(() => computeImpact(stories, records), [stories, records]);
  const costPerHour = useStore((s) => s.costPerHour);
  const days = daysUntil(PRIMARY_EXPERT.retiresOn);
  const first = PRIMARY_EXPERT.name.split(" ")[0];

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroFade = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 120]);

  return (
    <div className="relative overflow-x-clip">
      <div className="ambient" aria-hidden>
        <div className="ambient-grid" />
      </div>
      <div className="grain" aria-hidden />
      <LandingNav />

      {/* ---------------- HERO ---------------- */}
      <section ref={heroRef} className="relative min-h-[100svh]">
        <div className="pointer-events-none absolute inset-0">
          <Constellation progress={scrollYProgress} className="absolute inset-y-0 left-0 right-0 lg:left-[18%]" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-bg" />
        </div>
        <motion.div style={{ opacity: heroFade, y: heroY }} className="relative mx-auto flex min-h-[100svh] max-w-7xl flex-col justify-center px-5 pb-24 pt-32 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
            <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs text-muted">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bad" />
              {first} retires in <span className="font-semibold text-text">{days} days</span> · HackStellar PS-15
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
            className="mt-6 max-w-4xl text-balance text-5xl font-semibold leading-[0.98] sm:text-7xl lg:text-8xl"
          >
            Bottle the expert <span className="text-gradient">before they retire.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: EASE }}
            className="mt-6 max-w-2xl text-pretty text-lg text-muted sm:text-xl"
          >
            {PRIMARY_EXPERT.name} has kept these machines running for {PRIMARY_EXPERT.years} years. GhostWrench lets him <em className="not-italic text-text">talk</em>, turns what
            he says into a knowledge graph linked to the factory&apos;s fault records, and lets any junior ask his ghost by voice, in Hindi, Kannada or English.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45, ease: EASE }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Link href="/radar">
              <Button variant="primary" size="xl">
                Open the Risk Radar <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/story">
              <Button variant="glass" size="xl">
                <Play className="h-5 w-5 text-accent" /> Play the 60-second intro
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: EASE }}
            className="mt-14 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <HeroStat value={pct(cov.overall)} label="of downtime has a fix on record" tone={cov.overall >= 0.75 ? "ok" : "warn"} />
            <HeroStat value={String(cov.gaps.length)} label="fault codes nobody explained" tone="bad" />
            <HeroStat value={hours(cov.atRiskMin)} label="downtime a year at risk" tone="bad" />
            <HeroStat value={inr((impact.atRiskMin / 60) * costPerHour)} label="at risk when he leaves" tone="accent" />
          </motion.div>
        </motion.div>
        <motion.a
          href="#problem"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-[11px] uppercase tracking-[0.2em] text-muted hover:text-text"
        >
          Scroll
          <ArrowDown className="h-4 w-4 animate-bounce" />
        </motion.a>
      </section>

      {/* ---------------- PROBLEM ---------------- */}
      <section id="problem" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="lg:sticky lg:top-28">
            <motion.div {...fadeUp}>
              <Eyebrow className="text-accent">The problem</Eyebrow>
              <h2 className="mt-3 text-balance text-4xl font-semibold leading-[1.02] sm:text-5xl">
                The fault log says <span className="text-accent">what</span> broke. It never says <span className="text-accent">how</span> it was fixed.
              </h2>
              <p className="mt-5 max-w-xl text-pretty text-lg text-muted">
                Thirty-four years of &ldquo;called {first}, fixed&rdquo;. When the senior technician walks out, every one of those lines becomes a mystery a junior has to
                solve from scratch, with the machine stopped and the line waiting.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge tone="bad">
                  <AlertTriangle className="h-3.5 w-3.5" /> {pct(1 - cov.overall)} of last year&apos;s downtime has no written fix
                </Badge>
                <Badge tone="neutral">{FAULT_RECORDS.length} fault records · {faultStats(records).length} fault codes</Badge>
              </div>
            </motion.div>
          </div>
          <FaultLogTerminal />
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section id="how" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <Eyebrow className="text-accent">How it works</Eyebrow>
          <h2 className="mt-3 text-balance text-4xl font-semibold leading-[1.02] sm:text-5xl">From a rambling story to a guide anyone can ask.</h2>
          <p className="mt-4 text-pretty text-lg text-muted">Four steps. The expert only has to do the first one.</p>
        </motion.div>
        <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StepCard n={1} icon={Mic} title="Talk" body="Tap the mic and explain it the way you'd tell a new apprentice. Hinglish, Kanglish, rambling: all fine.">
            <WaveVisual />
          </StepCard>
          <StepCard n={2} icon={Brain} title="Structure" body="The AI pulls out symptoms, causes, fixes, tools, safety and the tribal tips no manual has. Nodes pop into the graph live.">
            <NodesVisual />
          </StepCard>
          <StepCard n={3} icon={Radar} title="Link to the records" body="Every story is tied to real fault codes. Coverage is weighted by downtime, so the biggest gaps rise to the top.">
            <div className="grid place-items-center py-2">
              <CoverageRing value={cov.overall} size={120} />
            </div>
          </StepCard>
          <StepCard n={4} icon={Ghost} title="Ask the ghost" body="A junior asks by voice. The ghost answers aloud, safety first, and plays the original recording as proof. No guessing, ever.">
            <ChatVisual />
          </StepCard>
        </div>
      </section>

      {/* ---------------- LIVE GRAPH ---------------- */}
      <section className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.4fr]">
          <motion.div {...fadeUp}>
            <Eyebrow className="text-accent">Living knowledge graph</Eyebrow>
            <h2 className="mt-3 text-balance text-4xl font-semibold leading-[1.02] sm:text-5xl">Watch the factory&apos;s memory grow, node by node.</h2>
            <p className="mt-5 text-pretty text-lg text-muted">
              Machines, fault codes, symptoms, causes, fixes and tools, derived straight from the recordings. Dashed red rings are faults nobody has explained yet. This
              one is live: it is built from the stories in this browser right now.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link href="/graph">
                <Button variant="primary">
                  Explore in 3D <Network className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/capture">
                <Button>
                  <Mic className="h-4 w-4" /> Add a story
                </Button>
              </Link>
            </div>
          </motion.div>
          <motion.div {...fadeUp} className="space-y-3">
            <LiveGraph />
            <GraphLegend />
          </motion.div>
        </div>
      </section>

      {/* ---------------- ASK DEMO ---------------- */}
      <section id="ask" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <Eyebrow className="text-accent">Try it</Eyebrow>
          <h2 className="mt-3 text-balance text-4xl font-semibold leading-[1.02] sm:text-5xl">Ask {first}&apos;s ghost. Right here.</h2>
          <p className="mt-4 text-pretty text-lg text-muted">
            This box runs the offline brain in your browser against the seed recordings. The real app uses Gemini and speaks the answer in your language.
          </p>
        </motion.div>
        <AskDemo />
      </section>

      {/* ---------------- MANUAL VS REALITY ---------------- */}
      <section className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <motion.div {...fadeUp}>
          <Eyebrow className="text-accent">Why the manual isn&apos;t enough</Eyebrow>
          <h2 className="mt-3 max-w-3xl text-balance text-4xl font-semibold leading-[1.02] sm:text-5xl">Three versions of the same fault.</h2>
        </motion.div>
        <ThreeVersions />
      </section>

      {/* ---------------- FEATURES ---------------- */}
      <section id="features" className="relative mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
          <Eyebrow className="text-accent">Everything in the app</Eyebrow>
          <h2 className="mt-3 text-balance text-4xl font-semibold leading-[1.02] sm:text-5xl">Built for the shop floor, not the boardroom.</h2>
        </motion.div>
        <FeatureGrid />
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="relative mx-auto max-w-7xl px-5 pb-24 pt-10 sm:px-8">
        <motion.div {...fadeUp}>
          <Card className="relative overflow-hidden p-10 text-center sm:p-16">
            <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-cool/15 blur-3xl" />
            <Logo size="lg" className="justify-center" />
            <h2 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-semibold leading-[1.02] sm:text-6xl">
              Every factory has a {first}. His last day shouldn&apos;t be the day his knowledge dies.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-muted">
              {days} days left. {cov.gaps.length} faults still unexplained. Start with the biggest one.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href={cov.gaps[0] ? `/interview?code=${cov.gaps[0].faultCode}` : "/interview"}>
                <Button variant="primary" size="xl">
                  <Mic className="h-5 w-5" /> Interview {first} about {cov.gaps[0]?.faultCode ?? "the gaps"}
                </Button>
              </Link>
              <Link href="/radar">
                <Button variant="glass" size="xl">
                  Open the app <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </Card>
        </motion.div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-5 pb-10 text-xs text-muted sm:px-8">
        <Logo size="sm" className="text-muted" />
        <span>HackStellar PS-15 · &ldquo;The Retiring Technician&rdquo;</span>
        <span className="ml-auto flex gap-4">
          <Link href="/story" className="hover:text-text">
            Intro
          </Link>
          <Link href="/report" className="hover:text-text">
            Handover report
          </Link>
          <Link href="/radar" className="hover:text-text">
            App
          </Link>
        </span>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function LandingNav() {
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 80], [0, 1]);
  return (
    <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, ease: EASE }} className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-4">
      <motion.div style={{ opacity: bg }} className="glass-strong pointer-events-none absolute inset-x-3 top-3 h-[52px] rounded-2xl sm:inset-x-4" />
      <div className="relative mx-auto flex h-[52px] max-w-7xl items-center gap-4 px-3 sm:px-4">
        <Link href="/" aria-label="GhostWrench">
          <Logo />
        </Link>
        <nav className="ml-6 hidden items-center gap-5 text-sm text-muted md:flex">
          <a href="#problem" className="hover:text-text">
            The problem
          </a>
          <a href="#how" className="hover:text-text">
            How it works
          </a>
          <a href="#ask" className="hover:text-text">
            Ask the ghost
          </a>
          <a href="#features" className="hover:text-text">
            Features
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/story" className="hidden text-sm text-muted hover:text-text sm:block">
            Intro
          </Link>
          <Link href="/radar">
            <Button variant="primary" size="sm">
              Open the app <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.header>
  );
}

const TONE_TEXT = { ok: "text-ok", bad: "text-bad", warn: "text-warn", accent: "text-accent" } as const;

function HeroStat({ value, label, tone }: { value: string; label: string; tone: keyof typeof TONE_TEXT }) {
  return (
    <div className="glass rounded-2xl px-4 py-3">
      <div className={cn("font-display text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl", TONE_TEXT[tone])}>{value}</div>
      <div className="mt-0.5 text-xs leading-snug text-muted">{label}</div>
    </div>
  );
}

/** The plant's actual fault log, typing itself out. */
function FaultLogTerminal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });
  const rows = useMemo(() => {
    const picks = ["E-311", "E-217", "H-102", "C-205", "E-105", "M-402"];
    return picks.map((c) => FAULT_RECORDS.filter((r) => r.faultCode === c).at(-1)).filter(Boolean) as typeof FAULT_RECORDS;
  }, []);
  return (
    <div ref={ref} className="glass-strong overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-bad/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-ok/70" />
        <span className="ml-3 font-mono text-xs text-muted">fault_records.csv · maintenance log · last 12 months</span>
      </div>
      <div className="space-y-2 p-4 font-mono text-[13px] leading-relaxed">
        <div className="grid grid-cols-[88px_60px_1fr] gap-3 text-[11px] uppercase tracking-wider text-muted/70">
          <span>date</span>
          <span>code</span>
          <span>resolution_note</span>
        </div>
        {rows.map((r, i) => (
          <motion.div
            key={r.recordId}
            initial={{ opacity: 0, x: -10 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.25 + i * 0.22, duration: 0.5, ease: EASE }}
            className="grid grid-cols-[88px_60px_1fr] gap-3 border-b border-white/5 pb-2 last:border-0"
          >
            <span className="text-muted">{r.date}</span>
            <span className="text-accent">{r.faultCode}</span>
            <span>
              <span className="text-text/85">&ldquo;{r.resolutionNote || "—"}&rdquo;</span>
              <span className="block text-[11px] text-muted">
                {machineById(r.machineId)?.name} · {r.downtimeMin} min down · {r.technician}
              </span>
            </span>
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.25 + rows.length * 0.22 + 0.3 }}
          className="mt-3 rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-xs text-bad"
        >
          <AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />
          {rows.length} incidents. {rows.reduce((a, r) => a + r.downtimeMin, 0)} minutes of downtime. Zero instructions.
        </motion.div>
      </div>
    </div>
  );
}

function StepCard({
  n,
  icon: Icon,
  title,
  body,
  children,
}: {
  n: number;
  icon: typeof Mic;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay: (n - 1) * 0.08, ease: EASE }}
    >
      <Card hover className="flex h-full flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
            <Icon className="h-5 w-5" />
          </span>
          <span className="font-mono text-xs text-muted">0{n}</span>
        </div>
        <div className="min-h-[120px] rounded-xl border border-white/5 bg-black/30 p-3">{children}</div>
        <div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="mt-1.5 text-sm text-muted">{body}</p>
        </div>
      </Card>
    </motion.div>
  );
}

function WaveVisual() {
  return (
    <div className="flex h-full items-center justify-center gap-1 py-4">
      {Array.from({ length: 28 }).map((_, i) => (
        <span
          key={i}
          className="wave-bar w-1 rounded-full bg-gradient-to-t from-accent to-ember"
          style={{ height: Math.round(8 + 40 * Math.abs(Math.sin(i * 0.9))), animationDelay: `${(i % 7) * 0.09}s`, animationDuration: `${0.8 + (i % 5) * 0.12}s` }}
        />
      ))}
    </div>
  );
}

function NodesVisual() {
  const nodes = [
    { x: 50, y: 50, c: "#ff7a1a", r: 7, l: "E-311" },
    { x: 22, y: 30, c: "#facc15", r: 5 },
    { x: 26, y: 72, c: "#facc15", r: 5 },
    { x: 76, y: 28, c: "#c084fc", r: 5 },
    { x: 80, y: 70, c: "#22c55e", r: 6 },
    { x: 58, y: 88, c: "#38bdf8", r: 4 },
  ];
  const links = [
    [0, 1],
    [0, 2],
    [0, 3],
    [3, 4],
    [4, 5],
  ];
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      {links.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={0.8}
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 + i * 0.2, duration: 0.5 }}
        />
      ))}
      {nodes.map((n, i) => (
        <motion.circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={n.r}
          fill={n.c}
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.18, type: "spring", stiffness: 300, damping: 18 }}
          style={{ transformOrigin: `${n.x}px ${n.y}px`, filter: `drop-shadow(0 0 4px ${n.c})` }}
        />
      ))}
      <text x={50} y={64} textAnchor="middle" fontSize={5} fill="#fff" fontFamily="monospace">
        E-311
      </text>
    </svg>
  );
}

function ChatVisual() {
  return (
    <div className="space-y-2 text-xs">
      <motion.div {...fadeUp} transition={{ delay: 0.1 }} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-white/10 px-3 py-2">
        Machine four is getting hot…
      </motion.div>
      <motion.div {...fadeUp} transition={{ delay: 0.35 }} className="flex items-start gap-2">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/20 text-accent">
          <Ghost className="h-3.5 w-3.5" />
        </span>
        <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-accent/30 bg-accent/10 px-3 py-2">
          Isolate first, wait 5 min. It&apos;s the cabinet filter, not the fan.
          <span className="mt-1.5 flex items-center gap-1.5 text-[10px] text-muted">
            <Volume2 className="h-3 w-3 text-accent" /> Raju, 0:42
            <span className="h-1 w-16 overflow-hidden rounded bg-white/10">
              <motion.span className="block h-full bg-accent" initial={{ width: 0 }} whileInView={{ width: "70%" }} viewport={{ once: true }} transition={{ delay: 0.8, duration: 1.4 }} />
            </span>
          </span>
        </div>
      </motion.div>
    </div>
  );
}

function LiveGraph() {
  const stories = useStore((s) => s.stories);
  const records = useRecords();
  const graph = useMemo(() => buildGraph(stories, records), [stories, records]);
  return (
    <div className="glass-strong overflow-hidden rounded-2xl p-1.5">
      <KnowledgeGraph graph={graph} height={440} />
    </div>
  );
}

const EXAMPLES = [
  "Machine four is getting hot and the alarm keeps coming back",
  "The press ram is slow and there's a whining noise",
  "Parts on the moulding machine are not filling fully",
  "The tool changer on the lathe is not indexing properly",
];

function AskDemo() {
  const stories = useStore((s) => s.stories);
  const records = useRecords();
  const [q, setQ] = useState("");
  const [turn, setTurn] = useState<{ q: string; r: AskResult } | null>(null);

  function ask(text: string) {
    const t = text.trim();
    if (!t) return;
    setTurn({ q: t, r: offlineAsk(t, stories, faultStats(records)) });
    setQ("");
  }
  const cited = turn ? stories.filter((s) => turn.r.citedStoryIds.includes(s.id)) : [];

  return (
    <motion.div {...fadeUp} className="mx-auto mt-10 max-w-3xl">
      <Card className="glass-strong space-y-4 p-4 sm:p-6">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-ember to-accent text-black">
            <Mic className="h-5 w-5" />
          </span>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Describe the problem like you would on the shop floor…" />
          <Button type="submit" variant="primary" className="h-11 shrink-0">
            Ask
          </Button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => ask(ex)} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-muted transition-colors hover:border-accent/50 hover:text-text">
              {ex}
            </button>
          ))}
        </div>
        {turn && (
          <motion.div key={turn.q} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 border-t border-white/10 pt-4">
            <div className="text-sm text-muted">
              <span className="font-medium text-text">Junior:</span> &ldquo;{turn.q}&rdquo;
            </div>
            <div className="flex gap-3">
              <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-full", turn.r.notCovered ? "bg-white/10 text-muted" : "bg-accent/15 text-accent")}>
                <Ghost className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium">Raju&apos;s ghost</span>
                  <Badge tone="neutral">offline brain</Badge>
                  {!turn.r.notCovered && <Badge tone={turn.r.confidence === "high" ? "ok" : "warn"}>{turn.r.confidence} confidence</Badge>}
                </div>
                <p className="text-lg leading-snug">{turn.r.spokenAnswer}</p>
                {turn.r.notCovered ? (
                  <div className="rounded-xl border border-warn/40 bg-warn/5 p-3 text-sm">
                    <div className="font-medium text-warn">Not covered yet, so it won&apos;t guess.</div>
                    <div className="mt-1 text-muted">In the app this question is added to Raju&apos;s interview list automatically.</div>
                  </div>
                ) : (
                  <>
                    {turn.r.safetyWarnings.length > 0 && (
                      <div className="rounded-xl border border-bad/40 bg-bad/5 p-3 text-sm">
                        <div className="mb-1 flex items-center gap-1.5 font-semibold text-bad">
                          <AlertTriangle className="h-4 w-4" /> Safety first
                        </div>
                        <ul className="list-inside list-disc text-text/90">
                          {turn.r.safetyWarnings.slice(0, 2).map((w) => (
                            <li key={w}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <ol className="space-y-1.5">
                      {turn.r.steps.slice(0, 4).map((s, i) => (
                        <li key={i} className="flex gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm">
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ok/15 text-xs font-semibold text-ok">{i + 1}</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                    {cited[0] && (
                      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 p-3">
                        <div className="min-w-0 flex-1">
                          <Eyebrow className="text-accent">Proof</Eyebrow>
                          <div className="mt-1 text-sm font-medium">{cited[0].extraction.title}</div>
                          <div className="text-xs text-muted">{expertById(cited[0].expertId)?.name}</div>
                        </div>
                        <AudioClip story={cited[0]} label="Hear him say it" />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}

function ThreeVersions() {
  const manual = MANUAL.find((m) => m.faultCode === LIVE_DEMO.faultCode);
  const record = FAULT_RECORDS.filter((r) => r.faultCode === LIVE_DEMO.faultCode).at(-1);
  const tip = LIVE_DEMO.extraction.tribalTips[0];
  const cols = [
    {
      icon: BookX,
      title: "The manual says",
      tone: "border-white/10",
      body: (
        <ol className="list-inside list-decimal space-y-1 text-sm text-muted">
          {manual?.says.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      ),
      foot: manual?.source,
    },
    {
      icon: FileText,
      title: "The fault log says",
      tone: "border-white/10",
      body: (
        <div className="font-mono text-sm">
          <div className="text-xs text-muted">
            {record?.recordId} · {record?.date} · {record?.downtimeMin} min
          </div>
          <div className="mt-2 text-xl text-text">&ldquo;{record?.resolutionNote}&rdquo;</div>
        </div>
      ),
      foot: "Every single time.",
    },
    {
      icon: Sparkles,
      title: `${PRIMARY_EXPERT.name.split(" ")[0]} says`,
      tone: "glass-accent",
      body: (
        <blockquote className="text-sm">
          <div className="font-medium">{tip?.text}</div>
          <div className="mt-2 italic text-muted">&ldquo;{tip?.quote}&rdquo;</div>
        </blockquote>
      ),
      foot: "Captured in 42 seconds of talking.",
    },
  ];
  return (
    <div className="mt-10 grid gap-4 md:grid-cols-3">
      {cols.map((c, i) => (
        <motion.div key={c.title} {...fadeUp} transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}>
          <Card className={cn("flex h-full flex-col", c.tone)}>
            <div className="flex items-center gap-2">
              <c.icon className={cn("h-4 w-4", i === 2 ? "text-accent" : "text-muted")} />
              <Eyebrow className={i === 2 ? "text-accent" : undefined}>{c.title}</Eyebrow>
            </div>
            <div className="mt-4 flex-1">{c.body}</div>
            <div className="mt-4 text-xs text-muted">{c.foot}</div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

const FEATURES = [
  { href: "/radar", icon: Radar, title: "Risk Radar", body: "Retirement countdown, downtime-weighted coverage and the ₹ at risk, ranked by what hurts most.", span: "md:col-span-2" },
  { href: "/interview", icon: Mic, title: "Interview Mode", body: "The AI interviews the expert about the gaps, in his language, and reads the questions aloud." },
  { href: "/ask", icon: Ghost, title: "Ask the Ghost", body: "Voice Q&A with cited recordings. Honest refusals that queue a new interview question." },
  { href: "/guides", icon: QrCode, title: "Guides + QR", body: "Tap-to-tick procedures. The whole guide is compressed inside a QR that opens offline on any phone.", span: "md:col-span-2" },
  { href: "/faults", icon: Siren, title: "Live alarms", body: "Simulate a machine fault: the ghost answers the alarm with the expert's fix before anyone picks up a phone." },
  { href: "/manual", icon: BookX, title: "Manual vs reality", body: "Every place the experts contradict the official manual, side by side, with proof." },
  { href: "/drill", icon: GraduationCap, title: "Apprentice drill", body: "Would you fix it the way Raju would? Scenario quizzes with manual traps." },
  { href: "/ask", icon: Languages, title: "Hindi · Kannada · English", body: "Sarvam Saaras for speech, Bulbul for an Indian voice. Code-mixed speech is fine." },
  { href: "/report", icon: ShieldCheck, title: "Handover report", body: "One printable page for HR and the maintenance head, generated live." },
];

function FeatureGrid() {
  return (
    <div className="mt-12 grid gap-4 md:grid-cols-3">
      {FEATURES.map((f, i) => (
        <motion.div key={f.title} {...fadeUp} transition={{ duration: 0.6, delay: (i % 3) * 0.08, ease: EASE }} className={f.span}>
          <Link href={f.href} className="block h-full">
            <Card hover className="group flex h-full flex-col">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-accent transition-colors group-hover:border-accent/40 group-hover:bg-accent/10">
                  <f.icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-muted transition-transform group-hover:translate-x-1 group-hover:text-text" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted">{f.body}</p>
            </Card>
          </Link>
        </motion.div>
      ))}
      <motion.div {...fadeUp} className="md:col-span-3">
        <Card className="flex flex-wrap items-center gap-4 glass-accent">
          <Wrench className="h-6 w-6 text-accent" />
          <div className="min-w-0 flex-1 text-sm">
            <span className="font-semibold">No database, no vector store.</span>{" "}
            <span className="text-muted">The whole knowledge base lives in the browser and goes to the model in full. Works offline with the built-in brain, so the demo never dies with the Wi-Fi.</span>
          </div>
          <Badge tone="ok">PWA · installable</Badge>
        </Card>
      </motion.div>
    </div>
  );
}
