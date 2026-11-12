import { callLLM } from "@/lib/llm";
import { offlineInterview } from "@/lib/offline";
import { INTERVIEW_SYSTEM } from "@/lib/prompts";
import { withFallback } from "@/lib/route-helpers";
import { hasSarvam, sarvamTranslate } from "@/lib/sarvam";
import { InterviewSchema } from "@/lib/schemas";
import { MACHINES } from "@/lib/seed";
import type { InterviewQuestion, Lang } from "@/lib/types";

export const maxDuration = 60;

type Gap = { id?: string; faultCode: string; machineId: string; description: string; occurrences: number; downtimeMin: number };
type Junior = { id?: string; question: string; faultCode: string; machineId: string };

const LANG_NAME: Record<Lang, string> = { "en-IN": "English", "hi-IN": "Hindi (Devanagari script)", "kn-IN": "Kannada (Kannada script)" };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { gaps?: Gap[]; junior?: Junior[]; lang?: Lang; demo?: boolean };
  const gaps = (body.gaps ?? []).slice(0, 8);
  const junior = (body.junior ?? []).slice(0, 8);
  const lang: Lang = body.lang && body.lang in LANG_NAME ? body.lang : "en-IN";
  const user = [
    `Expert being interviewed: Raju Gowda, 34 years, retires in a few weeks.`,
    `Interview language: ${LANG_NAME[lang]}.`,
    `Machines: ${MACHINES.map((m) => `${m.id} = ${m.name}`).join("; ")}`,
    `Knowledge gaps (fault codes with no captured fix):\n${gaps
      .map((g) => `- id=${g.id ?? `gap:${g.faultCode}`} ${g.faultCode} on ${g.machineId}: ${g.description}, ${g.occurrences}x, ${g.downtimeMin} min downtime`)
      .join("\n") || "(none)"}`,
    `Questions juniors asked that nobody could answer:\n${junior
      .map((j) => `- id=${j.id ?? "?"} [${j.faultCode || "?"} on ${j.machineId || "?"}] ${j.question}`)
      .join("\n") || "(none)"}`,
    `Write one question per gap and per junior question, keeping the id, faultCode and machineId.`,
  ].join("\n\n");

  return withFallback<{ questions: InterviewQuestion[] }>(
    Boolean(body.demo),
    () => callLLM({ system: INTERVIEW_SYSTEM, user, schema: InterviewSchema, effort: "low", thinking: "off", timeoutMs: 15_000, deadlineMs: 25_000 }),
    async () => {
      const base = offlineInterview(gaps, junior);
      // The offline brain writes English; localise it with Sarvam when we can, else leave it in English.
      if (lang === "en-IN" || !hasSarvam()) return base;
      const questions = await Promise.all(
        base.questions.map(async (q) => ({ ...q, question: await sarvamTranslate(q.question, "en-IN", lang).catch(() => q.question) })),
      );
      return { questions };
    },
  );
}
