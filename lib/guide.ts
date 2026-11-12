import { faultStats, machineById } from "./seed";
import { storiesForFault } from "./coverage";
import type { Guide, Story } from "./types";

const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Deterministic guide built straight from the stories. Used instantly, and as the offline fallback. */
export function buildGuide(code: string, allStories: Story[]): Guide | null {
  const stories = storiesForFault(allStories, code);
  if (!stories.length) return null;
  const stat = faultStats().find((f) => f.faultCode === code);
  const machine = machineById(stories[0].machineId);

  const steps: Guide["steps"] = [];
  const seen = new Map<string, number>();
  const safety = new Set<string>();
  const tools = new Set<string>();
  let estMinutes = 0;

  for (const s of stories) {
    for (const f of s.extraction.fixes) {
      f.safety.forEach((x) => safety.add(x));
      f.tools.forEach((x) => tools.add(x));
      estMinutes += f.estMinutes < 120 ? f.estMinutes : 0;
      for (const step of f.steps) {
        const k = key(step);
        const at = seen.get(k);
        if (at !== undefined) {
          if (!steps[at].sourceStoryIds.includes(s.id)) steps[at].sourceStoryIds.push(s.id);
        } else {
          seen.set(k, steps.length);
          steps.push({ text: step, sourceStoryIds: [s.id] });
        }
      }
    }
  }

  return {
    faultCode: code,
    title: stories[0].extraction.title,
    overview:
      stories.map((s) => s.extraction.summary).join(" ") ||
      `${stat?.description ?? code} on ${machine?.name ?? "this machine"}.`,
    safety: [...safety],
    steps,
    tools: [...tools],
    tips: stories.flatMap((s) => s.extraction.tribalTips.map((t) => ({ ...t, storyId: s.id }))),
    estMinutes,
  };
}

export function guideCacheKey(code: string, stories: Story[]): string {
  return `${code}:${storiesForFault(stories, code)
    .map((s) => s.id)
    .sort()
    .join(",")}`;
}

/** Compact payload for the offline QR guide. */
export type SharedGuide = { c: string; m: string; t: string; s: string[]; p: string[]; o: string[]; q: string[] };

export function toShared(g: Guide, machineName: string): SharedGuide {
  return {
    c: g.faultCode,
    m: machineName,
    t: g.title,
    s: g.safety.slice(0, 4),
    p: g.steps.map((x) => x.text).slice(0, 10),
    o: g.tools.slice(0, 6),
    q: g.tips.map((x) => x.text).slice(0, 3),
  };
}
