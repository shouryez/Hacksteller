/**
 * Offline brain: deterministic stand-ins for every Claude call, used when no API key is set,
 * when Demo Mode is on, or when a Claude call fails. Good enough to run the whole demo.
 */
import { EXPERTS, LIVE_DEMO, MACHINES, SEED_STORIES, faultStats, hours, machineById, type FaultStat } from "./seed";
import type { AskResult, InterviewQuestion, Story, StoryExtraction } from "./types";

const STOP = new Set(
  "a an the is are was were be been it its this that these those and or but if then so of on in at to for from with by as i me my we our you your he she they them his her what when where why how which who do does did doing done not no can could should would will just very also there here up down out about into over again keep keeps kept coming come comes back getting get gets got going go goes has have had please tell show".split(
    " ",
  ),
);

/** Generic words that hint at a problem but don't identify one. */
const WEAK = new Set(["alarm", "error", "problem", "issue", "fault", "machine", "trip", "trips", "code", "stop", "stopped", "working", "work"]);

const SYNONYMS: Record<string, string[]> = {
  hot: ["heat", "overheat", "overheating", "temperature", "temp", "warm", "summer", "cool", "cooler"],
  heat: ["hot", "overheat", "temperature"],
  overheat: ["hot", "heat", "temperature", "overheating"],
  temperature: ["hot", "heat", "overheat"],
  noise: ["whine", "whining", "sound", "noisy"],
  whine: ["noise", "whining", "sound"],
  sound: ["noise", "whine", "whining"],
  slow: ["slowly", "sluggish"],
  drift: ["drifting", "misalignment", "misaligned", "tracking", "side"],
  side: ["drift", "drifting", "tracking"],
  fill: ["filling", "short", "incomplete", "shots"],
  filling: ["fill", "short", "incomplete"],
  overload: ["load", "loads", "overloaded"],
  spindle: ["spindle"],
  belt: ["conveyor", "belt"],
  pressure: ["gauge", "bar", "pressure"],
  leak: ["leaking", "oil"],
  wet: ["moisture", "monsoon", "humid", "humidity", "rain"],
  rain: ["monsoon", "moisture", "humid"],
};

const NUMBER_WORDS: Record<string, string> = { one: "1", two: "2", four: "4", seven: "7", "1": "1", "2": "2", "4": "4", "7": "7" };

const MACHINE_ALIASES: Record<string, string[]> = {
  "L-04": ["lathe", "cnc", "l04", "spindle", "turning"],
  "HP-02": ["press", "hydraulic", "hp02", "ram"],
  "IM-07": ["moulder", "molder", "moulding", "molding", "injection", "im07", "mould", "mold"],
  "CV-01": ["conveyor", "belt", "cv01"],
};

const ALIAS_TOKENS = new Set(Object.values(MACHINE_ALIASES).flat().filter((t) => t !== "spindle" && t !== "belt" && t !== "ram"));

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/([a-z])-(\d)/g, "$1$2")
    .replace(/[^a-z0-9ऀ-෿ ]+/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t))
    .map((t) => (t.length > 4 ? t.replace(/(ing|ed|es|s)$/, "") : t));
}

function storyText(s: Story): string {
  const x = s.extraction;
  const m = machineById(s.machineId);
  return [
    m?.name,
    x.faultCodes.join(" "),
    x.title,
    x.summary,
    x.transcriptEnglish,
    x.symptoms.map((y) => y.label).join(" "),
    x.causes.map((y) => y.label).join(" "),
    x.fixes.map((y) => y.label).join(" "),
    x.tribalTips.map((y) => y.text).join(" "),
  ].join(" ");
}

export function detectMachine(question: string): string | undefined {
  const toks = tokenize(question);
  const lower = question.toLowerCase();
  for (const m of MACHINES) {
    if (lower.includes(m.id.toLowerCase())) return m.id;
  }
  // "machine four", "number 4"
  for (let i = 0; i < toks.length; i++) {
    const n = NUMBER_WORDS[toks[i]];
    if (n) {
      const m = MACHINES.find((mm) => mm.id.endsWith(n));
      if (m) return m.id;
    }
  }
  for (const [id, aliases] of Object.entries(MACHINE_ALIASES)) {
    if (toks.some((t) => aliases.includes(t))) return id;
  }
  return undefined;
}

export function detectFaultCodes(text: string): string[] {
  const codes = new Set<string>();
  const re = /\b([ehqc])\s?-?\s?(\d{3})\b/gi;
  for (const m of text.matchAll(re)) codes.add(`${m[1].toUpperCase()}-${m[2]}`);
  return [...codes];
}

function expand(tokens: string[]): Map<string, number> {
  const weights = new Map<string, number>();
  for (const t of tokens) {
    const w = WEAK.has(t) ? 0.5 : 2;
    weights.set(t, Math.max(weights.get(t) ?? 0, w));
    for (const syn of SYNONYMS[t] ?? []) {
      const st = tokenize(syn)[0];
      if (st) weights.set(st, Math.max(weights.get(st) ?? 0, w * 0.75));
    }
  }
  return weights;
}

type Scored = { story: Story; score: number; content: number; distinct: number };

export function scoreStories(question: string, stories: Story[]): Scored[] {
  const qWeights = expand(tokenize(question));
  const machine = detectMachine(question);
  const codes = detectFaultCodes(question);
  return stories
    .map((story) => {
      const sTokens = new Set(tokenize(storyText(story)));
      let content = 0;
      let distinct = 0;
      for (const [t, w] of qWeights) {
        if (!sTokens.has(t) || ALIAS_TOKENS.has(t)) continue;
        content += w;
        if (w >= 1.5) distinct++;
      }
      let score = content;
      if (machine && story.machineId === machine) score += 2;
      if (machine && story.machineId !== machine) score -= 2;
      const codeHit = codes.some((c) => story.extraction.faultCodes.includes(c));
      if (codeHit) {
        score += 6;
        distinct += 2;
      }
      return { story, score, content, distinct };
    })
    .sort((a, b) => b.score - a.score);
}

/** Best guess of which fault a free-text question is about (used to queue unanswered questions). */
export function guessFault(question: string, stats: FaultStat[] = faultStats()): FaultStat | undefined {
  return guessFaultScored(question, stats)?.s;
}

function guessFaultScored(question: string, stats: FaultStat[] = faultStats()): { s: FaultStat; score: number } | undefined {
  const codes = detectFaultCodes(question);
  const byCode = codes.length ? stats.find((s) => s.faultCode === codes[0]) : undefined;
  if (byCode) return { s: byCode, score: 10 };
  const machine = detectMachine(question);
  const qWeights = expand(tokenize(question));
  let best: { s: FaultStat; score: number } | undefined;
  for (const s of stats) {
    if (machine && s.machineId !== machine) continue;
    const dTokens = new Set(tokenize(s.description));
    let score = 0;
    for (const [t, w] of qWeights) if (dTokens.has(t)) score += w;
    if (!best || score > best.score) best = { s, score };
  }
  return best;
}

export function offlineAsk(question: string, stories: Story[], stats: FaultStat[] = faultStats()): AskResult {
  const ranked = scoreStories(question, stories);
  const top = ranked[0];
  const expertName = (id: string) => EXPERTS.find((e) => e.id === id)?.name.split(" ")[0] ?? "the expert";

  // The question clearly names a different fault that nobody has explained: refuse rather than misanswer.
  const guessed = guessFaultScored(question, stats);
  const describesOtherGap =
    guessed &&
    guessed.score >= 4 &&
    top &&
    !top.story.extraction.faultCodes.includes(guessed.s.faultCode) &&
    !stories.some((st) => st.extraction.faultCodes.includes(guessed.s.faultCode) && st.extraction.fixes.length);

  if (!top || top.score < 4 || top.distinct < 1 || describesOtherGap) {
    const fault = guessed?.s;
    const machine = fault ? machineById(fault.machineId) : undefined;
    const about = fault ? `${fault.faultCode} (${fault.description}) on ${machine?.name}` : "this";
    return {
      spokenAnswer: `I'm sorry, no senior technician has explained ${about} yet. I won't guess on a repair. I've added your question to Raju's interview list so we capture it before he retires.`,
      safetyWarnings: [],
      steps: [],
      tools: [],
      citedStoryIds: [],
      confidence: "low",
      notCovered: true,
      suggestedInterviewQuestion: fault
        ? `Raju, ${fault.faultCode} (${fault.description}) on ${machine?.name} happened ${fault.occurrences} times this year. A junior asked: "${question}". What do you check first, and what's the real fix?`
        : `Raju, a junior asked: "${question}". What do you check first, and what's the real fix?`,
    };
  }

  const s = top.story;
  const x = s.extraction;
  const qWeights = expand(tokenize(question));
  const fixes = [...x.fixes].sort((a, b) => {
    const sc = (f: (typeof x.fixes)[number]) =>
      tokenize([f.label, ...f.steps].join(" ")).reduce((acc, t) => acc + (qWeights.get(t) ?? 0), 0);
    return sc(b) - sc(a);
  });
  const cited = [s.id];
  const second = ranked[1];
  if (second && second.story.machineId === s.machineId && second.score >= top.score * 0.8 && second.distinct >= 2) {
    cited.push(second.story.id);
  }
  const tip = x.tribalTips[0];
  const machine = machineById(s.machineId);
  return {
    spokenAnswer: `${expertName(s.expertId)} explained this one for ${machine?.name ?? s.machineId}. ${x.summary}${
      tip && !x.summary.includes(tip.text.slice(0, 40)) ? ` Tip: ${tip.text.replace(/[.…]+$/, "")}.` : ""
    }`,
    safetyWarnings: [...new Set(fixes.flatMap((f) => f.safety))],
    steps: fixes.flatMap((f) => f.steps).slice(0, 10),
    tools: [...new Set(fixes.flatMap((f) => f.tools))],
    citedStoryIds: cited,
    confidence: top.score >= 9 ? "high" : top.score >= 6 ? "medium" : "low",
    notCovered: false,
    suggestedInterviewQuestion: "",
  };
}

const IMPERATIVE =
  /\b(check|clean|tighten|bleed|replace|top up|turn|wait|remove|switch off|lock ?out|open|close|bring|take|blow|wash|reduce|inspect|adjust|scrape|refit|set|measure|drain|grease|restart|give)\b/i;
const CAUSAL = /\b(because|means|is the problem|the problem is|happens|cause|due to|that is|it's the|comes from)\b/i;
const SYMPTOM = /\b(when|if|comes|noise|sound|slow|alarm|trips?|drift|hot|leak|vibrat|smell|not filling|short)\b/i;
const SAFETY = /\b(lock ?out|tag ?out|switch off|isolat|careful|burn|shock|stored pressure|pressuri[sz]ed|capacitor|never .*hot|wait .* minutes|hand (in|there|inside))/i;
const TIP = /\b(don't|do not|never|always|manual|trust|no need|most of the time|ninety percent|half the time|young fellows|people)\b/i;
const TOOLS = [
  "allen key",
  "spanner",
  "screwdriver",
  "refractometer",
  "multimeter",
  "scraper",
  "air gun",
  "compressed air",
  "wrench",
  "torque wrench",
  "grease gun",
  "feeler gauge",
  "dial gauge",
  "thermometer",
  "hammer",
  "pliers",
];

function overlap(a: string, b: string): number {
  const A = new Set(tokenize(a));
  const B = new Set(tokenize(b));
  let n = 0;
  for (const t of A) if (B.has(t)) n++;
  return n / Math.max(1, Math.min(A.size, B.size));
}

export function offlineExtract(transcript: string, machineId: string, allStats: FaultStat[] = faultStats()): StoryExtraction {
  // Rehearsed stories map straight to their curated extraction.
  if (overlap(transcript, LIVE_DEMO.transcript) > 0.45 || (machineId === "L-04" && /servo|e-?\s?311|over-?temp|cabinet filter/i.test(transcript))) {
    return LIVE_DEMO.extraction;
  }
  for (const s of SEED_STORIES) if (overlap(transcript, s.transcript) > 0.55) return s.extraction;

  const sentences = transcript
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);
  const stats = allStats.filter((f) => f.machineId === machineId);
  let codes = detectFaultCodes(transcript);
  if (!codes.length) {
    const g = guessFault(transcript, stats);
    if (g) {
      const dTokens = new Set(tokenize(g.description));
      if (tokenize(transcript).some((t) => dTokens.has(t))) codes = [g.faultCode];
    }
  }

  const symptoms = sentences.filter((s) => SYMPTOM.test(s) && !IMPERATIVE.test(s)).slice(0, 3);
  const causes = sentences.filter((s) => CAUSAL.test(s)).slice(0, 3);
  const steps = sentences.filter((s) => IMPERATIVE.test(s)).slice(0, 8);
  const lower = transcript.toLowerCase();
  const tools = TOOLS.filter((t) => lower.includes(t)).map((t) => t.replace(/\b\w/g, (c) => c.toUpperCase()));
  const safety = sentences.filter((s) => SAFETY.test(s)).slice(0, 3);
  const tips = sentences.filter((s) => TIP.test(s)).slice(0, 3);
  const manualCorrections = sentences
    .map((s, i) => ({ s, next: sentences[i + 1] }))
    .filter(({ s }) => /\bmanual\b/i.test(s))
    .slice(0, 3)
    .map(({ s, next }) => ({ manualSays: clip(s, 140), expertSays: clip(next ?? s, 160) }));
  const minutes = /(\d+|ten|twenty|thirty|half an hour)\s*(minutes|mins|hour)?/i.exec(transcript);
  const est = minutes
    ? /half an hour/i.test(minutes[0])
      ? 30
      : ({ ten: 10, twenty: 20, thirty: 30 } as Record<string, number>)[minutes[1].toLowerCase()] ?? Number(minutes[1])
    : 30;

  const symptomList = (symptoms.length ? symptoms : [sentences[0] ?? "Reported fault"]).map((label, i) => ({ id: `s${i + 1}`, label: clause(label) }));
  const causeList = causes.map((label, i) => ({ id: `c${i + 1}`, label: clause(label), symptomIds: symptomList.map((s) => s.id) }));
  const fixes = steps.length
    ? [
        {
          id: "f1",
          label: clause(steps[0]),
          causeIds: causeList.map((c) => c.id),
          steps,
          tools,
          safety,
          estMinutes: Number.isFinite(est) ? est : 30,
        },
      ]
    : [];

  return {
    title: clause(sentences[0] ?? "Recorded repair knowledge"),
    summary: clip(sentences.slice(0, 2).join(" "), 220),
    transcriptEnglish: transcript,
    faultCodes: codes,
    symptoms: symptomList,
    causes: causeList,
    fixes,
    tribalTips: tips.map((t) => ({ text: clip(t, 90), quote: t })),
    manualCorrections,
    confidence: fixes.length && causeList.length ? "medium" : "low",
  };
}

/** First clause of a sentence, capitalised, for short graph labels and titles. */
function clause(s: string): string {
  const first = s.split(/[,;:]| - | because | so /i)[0].replace(/[.!?]+$/, "").trim();
  const t = clip(first || s, 60);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function clip(s: string, n = 80): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t;
}

export function offlineInterview(
  gaps: { id?: string; faultCode: string; machineId: string; description: string; occurrences: number; downtimeMin: number }[],
  junior: { id?: string; question: string; faultCode: string; machineId: string }[],
): { questions: InterviewQuestion[] } {
  const qs: InterviewQuestion[] = gaps.map((g) => {
    const m = machineById(g.machineId);
    const question = `Raju, ${g.faultCode} (${g.description.toLowerCase()}) on ${m?.name} happened ${g.occurrences} times this year. When it shows up, what do you check first, and what's the real fix?`;
    return { id: g.id ?? `gap:${g.faultCode}`, faultCode: g.faultCode, machineId: g.machineId, question, questionEn: question, why: `${hours(g.downtimeMin)} of downtime and no captured fix.` };
  });
  for (const j of junior) {
    qs.unshift({ id: j.id, faultCode: j.faultCode, machineId: j.machineId, question: j.question, questionEn: j.question, why: "A junior asked this and nobody could answer." });
  }
  return { questions: qs };
}
