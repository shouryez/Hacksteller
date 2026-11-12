import { storiesForFault } from "./coverage";
import { buildGuide } from "./guide";
import { machineName } from "./records";
import { FAULT_RECORDS, expertById, faultStats, manualFor } from "./seed";
import type { FaultRecord, Story } from "./types";

export type DrillKind = "first" | "manual" | "cause" | "safety";

export type DrillQuestion = {
  id: string;
  kind: DrillKind;
  faultCode: string;
  storyId: string;
  prompt: string;
  options: string[];
  answer: number;
  explain: string;
  quote?: string;
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: T[], rand: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Builds a multiple-choice drill straight from the captured stories. Wrong options come from other
 * faults and from the manual, so the traps are the mistakes people actually make.
 */
export function buildDrill(stories: Story[], records: FaultRecord[] = FAULT_RECORDS, seed = 1, max = 8): DrillQuestion[] {
  const rand = rng(seed);
  const stats = faultStats(records);
  const covered = stats.filter((f) => storiesForFault(stories, f.faultCode).length > 0);
  const pool: DrillQuestion[] = [];

  const make = (q: Omit<DrillQuestion, "options" | "answer" | "id"> & { correct: string; distractors: string[] }) => {
    const seen = new Set([norm(q.correct)]);
    const wrong = shuffle(q.distractors, rand).filter((d) => {
      const k = norm(d);
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (wrong.length < 1) return;
    const options = shuffle([q.correct, ...wrong.slice(0, 3)], rand);
    pool.push({
      id: `${q.kind}:${q.faultCode}:${pool.length}`,
      kind: q.kind,
      faultCode: q.faultCode,
      storyId: q.storyId,
      prompt: q.prompt,
      options,
      answer: options.indexOf(q.correct),
      explain: q.explain,
      quote: q.quote,
    });
  };

  const guides = covered.map((f) => ({ f, guide: buildGuide(f.faultCode, stories)!, story: storiesForFault(stories, f.faultCode)[0] }));

  for (const { f, guide, story } of guides) {
    const x = story.extraction;
    const expert = expertById(story.expertId)?.name.split(" ")[0] ?? "the expert";
    const machine = machineName(f.machineId);
    const others = guides.filter((g) => g.f.faultCode !== f.faultCode);
    const tip = x.tribalTips[0];

    if (guide.steps[0]) {
      make({
        kind: "first",
        faultCode: f.faultCode,
        storyId: story.id,
        prompt: `${machine} raises ${f.faultCode} (${f.description}). According to ${expert}, what do you do first?`,
        correct: guide.steps[0].text,
        distractors: [...(manualFor(f.faultCode)?.says.slice(0, 2) ?? []), ...others.map((g) => g.guide.steps[0]?.text ?? "")],
        explain: x.summary,
        quote: tip?.quote,
      });
    }
    for (const c of x.manualCorrections ?? []) {
      make({
        kind: "manual",
        faultCode: f.faultCode,
        storyId: story.id,
        prompt: `${f.faultCode} on ${machine}. The manual says: “${c.manualSays}” What does ${expert} do instead?`,
        correct: c.expertSays,
        distractors: [
          "Follow the manual exactly; it was written by the manufacturer.",
          ...others.flatMap((g) => (g.story.extraction.manualCorrections ?? []).map((m) => m.expertSays)),
        ],
        explain: `The manual and ${expert} disagree here, and ${expert}'s way is what actually fixes it on this machine.`,
        quote: tip?.quote,
      });
    }
    if (x.symptoms[0] && x.causes[0]) {
      make({
        kind: "cause",
        faultCode: f.faultCode,
        storyId: story.id,
        prompt: `On ${machine} you notice: “${x.symptoms[0].label}”. What is the most likely cause?`,
        correct: x.causes[0].label,
        distractors: others.flatMap((g) => g.story.extraction.causes.map((c) => c.label)),
        explain: x.summary,
        quote: tip?.quote,
      });
    }
    const safeFix = x.fixes.find((fx) => fx.safety.length > 0);
    if (safeFix) {
      make({
        kind: "safety",
        faultCode: f.faultCode,
        storyId: story.id,
        prompt: `Before “${safeFix.label}” on ${machine}, which precaution is a must?`,
        correct: safeFix.safety[0],
        distractors: ["No precaution needed if you are quick.", ...others.flatMap((g) => g.guide.safety)],
        explain: `Safety comes before the first step: ${safeFix.safety.join("; ")}.`,
      });
    }
  }

  // Round-robin across kinds and faults so one fault doesn't dominate a short drill.
  const byKind: Record<DrillKind, DrillQuestion[]> = { first: [], manual: [], cause: [], safety: [] };
  for (const q of shuffle(pool, rand)) byKind[q.kind].push(q);
  const order: DrillKind[] = ["first", "manual", "cause", "safety"];
  const out: DrillQuestion[] = [];
  const perFault = new Map<string, number>();
  while (out.length < max) {
    let added = false;
    for (const k of order) {
      const list = byKind[k];
      list.sort((a, b) => (perFault.get(a.faultCode) ?? 0) - (perFault.get(b.faultCode) ?? 0));
      const q = list.shift();
      if (q && out.length < max) {
        out.push(q);
        perFault.set(q.faultCode, (perFault.get(q.faultCode) ?? 0) + 1);
        added = true;
      }
    }
    if (!added) break;
  }
  return out;
}
