import type { StoryExtraction } from "./types";

export type CompletenessCheck = { key: string; label: string; ok: boolean; followUp: string };

/** What a usable repair explanation needs, and the follow-up question that fills each hole. */
export function completeness(x: StoryExtraction): { checks: CompletenessCheck[]; done: number; total: number } {
  const steps = x.fixes.reduce((a, f) => a + f.steps.length, 0);
  const checks: CompletenessCheck[] = [
    { key: "code", label: "Fault code", ok: x.faultCodes.length > 0, followUp: "Which alarm code shows on the screen when this happens?" },
    { key: "symptoms", label: "Symptoms", ok: x.symptoms.length > 0, followUp: "How do you first notice it? What do you see, hear or smell?" },
    { key: "cause", label: "Root cause", ok: x.causes.length > 0, followUp: "What is actually causing it underneath?" },
    { key: "steps", label: "Fix steps", ok: steps >= 2, followUp: "Walk me through the fix step by step. What exactly do you do, in order?" },
    { key: "tools", label: "Tools & spares", ok: x.fixes.some((f) => f.tools.length > 0), followUp: "Which tools or spares should someone have ready before starting?" },
    { key: "safety", label: "Safety", ok: x.fixes.some((f) => f.safety.length > 0), followUp: "What can hurt someone doing this? What must they switch off or lock out first?" },
    {
      key: "tribal",
      label: "Tribal knowledge",
      ok: x.tribalTips.length > 0 || (x.manualCorrections?.length ?? 0) > 0,
      followUp: "What does the manual get wrong here, or what mistake do juniors usually make?",
    },
  ];
  return { checks, done: checks.filter((c) => c.ok).length, total: checks.length };
}
