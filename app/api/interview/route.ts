import { callLLM } from "@/lib/llm";
import { offlineInterview } from "@/lib/offline";
import { INTERVIEW_SYSTEM } from "@/lib/prompts";
import { withFallback } from "@/lib/route-helpers";
import { InterviewSchema } from "@/lib/schemas";
import { MACHINES } from "@/lib/seed";
import type { InterviewQuestion } from "@/lib/types";

export const maxDuration = 60;

type Gap = { faultCode: string; machineId: string; description: string; occurrences: number; downtimeMin: number };
type Junior = { question: string; faultCode: string; machineId: string };

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { gaps?: Gap[]; junior?: Junior[]; demo?: boolean };
  const gaps = (body.gaps ?? []).slice(0, 8);
  const junior = (body.junior ?? []).slice(0, 8);
  const user = [
    `Expert being interviewed: Raju Gowda, 34 years, retires in a few weeks.`,
    `Machines: ${MACHINES.map((m) => `${m.id} = ${m.name}`).join("; ")}`,
    `Knowledge gaps (fault codes with no captured fix):\n${gaps
      .map((g) => `- ${g.faultCode} on ${g.machineId}: ${g.description}, ${g.occurrences}x, ${g.downtimeMin} min downtime`)
      .join("\n") || "(none)"}`,
    `Questions juniors asked that nobody could answer:\n${junior
      .map((j) => `- [${j.faultCode || "?"} on ${j.machineId || "?"}] ${j.question}`)
      .join("\n") || "(none)"}`,
    `Write one question per gap and per junior question, keeping the faultCode and machineId.`,
  ].join("\n\n");

  return withFallback<{ questions: InterviewQuestion[] }>(
    Boolean(body.demo),
    () => callLLM({ system: INTERVIEW_SYSTEM, user, schema: InterviewSchema, effort: "low", thinking: "off", timeoutMs: 15_000, deadlineMs: 25_000 }),
    () => offlineInterview(gaps, junior),
  );
}
