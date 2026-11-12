import { callLLM } from "@/lib/llm";
import { offlineExtract } from "@/lib/offline";
import { EXTRACT_SYSTEM } from "@/lib/prompts";
import { badRequest, withFallback } from "@/lib/route-helpers";
import { StoryExtractionSchema } from "@/lib/schemas";
import { machinesFor, mergeRecords, sanitizeRecords } from "@/lib/records";
import { MANUAL, expertById, faultStats } from "@/lib/seed";
import type { StoryExtraction } from "@/lib/types";

export const maxDuration = 60;

type Body = {
  transcript?: string;
  englishHint?: string;
  machineId?: string;
  expertId?: string;
  language?: string;
  existingLabels?: string[];
  interviewQuestion?: string;
  extraRecords?: unknown;
  demo?: boolean;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const transcript = body.transcript?.trim();
  if (!transcript) return badRequest("transcript is required");
  const records = mergeRecords(sanitizeRecords(body.extraRecords));
  const machine = machinesFor(records).find((m) => m.id === body.machineId);
  if (!machine) return badRequest("unknown machineId");
  const expert = expertById(body.expertId ?? "");
  const stats = faultStats(records);
  const faults = stats.filter((f) => f.machineId === machine.id);
  const manual = MANUAL.filter((m) => m.machineId === machine.id);

  const user = [
    `Machine: ${machine.name} (${machine.id}), ${machine.type}, ${machine.line}`,
    `Technician: ${expert ? `${expert.name}, ${expert.years} years` : "unknown"}`,
    `Spoken language setting: ${body.language ?? "en-IN"}`,
    body.interviewQuestion ? `The technician was answering this interview question: "${body.interviewQuestion}"` : "",
    `Fault codes recorded for this machine:\n${faults
      .map((f) => `- ${f.faultCode}: ${f.description} (${f.occurrences} occurrences, ${f.downtimeMin} min downtime)`)
      .join("\n")}`,
    manual.length
      ? `Official manual excerpts for this machine (compare the technician's method against these for manualCorrections):\n${manual
          .map((m) => `- ${m.faultCode} (${m.source}): ${m.says.join(" ")}`)
          .join("\n")}`
      : "",
    `Existing knowledge-graph labels (reuse when equivalent):\n${(body.existingLabels ?? []).slice(0, 80).join(" | ") || "(none)"}`,
    `<transcript>\n${transcript}\n</transcript>`,
    body.englishHint ? `<english_translation>\n${body.englishHint}\n</english_translation>` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return withFallback<StoryExtraction>(
    Boolean(body.demo),
    async () => tidy(await callLLM({ system: EXTRACT_SYSTEM, user, schema: StoryExtractionSchema, effort: "medium", timeoutMs: 30_000, deadlineMs: 45_000 })),
    () => offlineExtract(body.englishHint || transcript, machine.id, stats),
  );
}

/** Strips list numbering and duplicate safety lines that models sometimes add. */
function tidy(x: StoryExtraction): StoryExtraction {
  const clean = (s: string) => s.replace(/^\s*(\d+[.)]|[-*•])\s+/, "").trim();
  return {
    ...x,
    fixes: x.fixes.map((f) => ({ ...f, steps: f.steps.map(clean).filter(Boolean), safety: [...new Set(f.safety.map(clean))] })),
    manualCorrections: (x.manualCorrections ?? []).filter((c) => c.manualSays.trim() && c.expertSays.trim()),
  };
}
