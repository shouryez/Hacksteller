import { callClaude } from "@/lib/claude";
import { offlineExtract } from "@/lib/offline";
import { EXTRACT_SYSTEM } from "@/lib/prompts";
import { badRequest, withFallback } from "@/lib/route-helpers";
import { StoryExtractionSchema } from "@/lib/schemas";
import { expertById, faultStats, machineById } from "@/lib/seed";
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
  demo?: boolean;
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  const transcript = body.transcript?.trim();
  if (!transcript) return badRequest("transcript is required");
  const machine = machineById(body.machineId ?? "");
  if (!machine) return badRequest("unknown machineId");
  const expert = expertById(body.expertId ?? "");
  const faults = faultStats().filter((f) => f.machineId === machine.id);

  const user = [
    `Machine: ${machine.name} (${machine.id}), ${machine.type}, ${machine.line}`,
    `Technician: ${expert ? `${expert.name}, ${expert.years} years` : "unknown"}`,
    `Spoken language setting: ${body.language ?? "en-IN"}`,
    body.interviewQuestion ? `The technician was answering this interview question: "${body.interviewQuestion}"` : "",
    `Fault codes recorded for this machine:\n${faults
      .map((f) => `- ${f.faultCode}: ${f.description} (${f.occurrences} occurrences, ${f.downtimeMin} min downtime)`)
      .join("\n")}`,
    `Existing knowledge-graph labels (reuse when equivalent):\n${(body.existingLabels ?? []).slice(0, 80).join(" | ") || "(none)"}`,
    `<transcript>\n${transcript}\n</transcript>`,
    body.englishHint ? `<english_translation>\n${body.englishHint}\n</english_translation>` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return withFallback<StoryExtraction>(
    Boolean(body.demo),
    () => callClaude({ system: EXTRACT_SYSTEM, user, schema: StoryExtractionSchema, effort: "medium" }),
    () => offlineExtract(body.englishHint || transcript, machine.id),
  );
}
