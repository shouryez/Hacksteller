import { callLLM } from "@/lib/llm";
import { guessFault, offlineAsk, scoreStories } from "@/lib/offline";
import { ASK_SYSTEM } from "@/lib/prompts";
import { badRequest, withFallback } from "@/lib/route-helpers";
import { hasSarvam, sarvamTranslate } from "@/lib/sarvam";
import { AskResultSchema } from "@/lib/schemas";
import { machinesFor, mergeRecords, sanitizeRecords } from "@/lib/records";
import { EXPERTS, faultStats } from "@/lib/seed";
import type { AskResult, Story } from "@/lib/types";

export const maxDuration = 60;

const LANG_NAME: Record<string, string> = { "en-IN": "English", "hi-IN": "Hindi", "kn-IN": "Kannada" };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    question?: string;
    stories?: Story[];
    answerLang?: string;
    extraRecords?: unknown;
    demo?: boolean;
  };
  const question = body.question?.trim();
  if (!question) return badRequest("question is required");
  const stories = Array.isArray(body.stories) ? body.stories : [];

  const records = mergeRecords(sanitizeRecords(body.extraRecords));
  const stats = faultStats(records);
  const knowledge = stories.map((s) => ({
    id: s.id,
    expert: EXPERTS.find((e) => e.id === s.expertId)?.name ?? s.expertId,
    machineId: s.machineId,
    faults: s.extraction.faultCodes.map((c) => `${c} ${stats.find((f) => f.faultCode === c)?.description ?? ""}`.trim()),
    recordedAt: s.createdAt.slice(0, 10),
    transcript: s.extraction.transcriptEnglish || s.transcript,
    extraction: { ...s.extraction, transcriptEnglish: undefined },
  }));
  const ranked = scoreStories(question, stories).slice(0, 3);
  const likely = guessFault(question, stats);
  const hints = [
    likely ? `Fault whose description best matches the question: ${likely.faultCode} (${likely.description}) on ${likely.machineId}.` : "",
    `Keyword pre-ranking of stories (a hint, may be wrong): ${ranked.map((r) => `${r.story.id} [${r.story.extraction.faultCodes.join(",") || "no code"}]`).join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
  const user = [
    `Machines: ${machinesFor(records).map((m) => `${m.id} = ${m.name}`).join("; ")}`,
    `Fault statistics (last 12 months):\n${stats
      .map((f) => `- ${f.faultCode} on ${f.machineId}: ${f.description}, ${f.occurrences}x, ${f.downtimeMin} min`)
      .join("\n")}`,
    `Recorded knowledge (${knowledge.length} stories):\n${JSON.stringify(knowledge)}`,
    `Answer language for spokenAnswer: ${LANG_NAME[body.answerLang ?? "en-IN"] ?? "English"}`,
    `Retrieval hints:\n${hints}`,
    `Junior technician's question: "${question}"`,
  ].join("\n\n");

  return withFallback<AskResult>(
    Boolean(body.demo),
    () => callLLM({ system: ASK_SYSTEM, user, schema: AskResultSchema, effort: "low", thinking: "light", timeoutMs: 12_000, deadlineMs: 25_000 }),
    async () => {
      const result = offlineAsk(question, stories, stats);
      const lang = body.answerLang ?? "en-IN";
      // The offline brain only speaks English; let Sarvam localise the spoken part.
      if (lang !== "en-IN" && hasSarvam()) {
        try {
          result.spokenAnswer = await sarvamTranslate(result.spokenAnswer, "en-IN", lang);
        } catch (err) {
          console.error("[sarvam] translate failed:", err);
        }
      }
      return result;
    },
  );
}
