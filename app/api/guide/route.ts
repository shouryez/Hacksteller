import { NextResponse } from "next/server";
import { callLLM } from "@/lib/llm";
import { buildGuide } from "@/lib/guide";
import { GUIDE_SYSTEM } from "@/lib/prompts";
import { badRequest, withFallback } from "@/lib/route-helpers";
import { GuideSchema } from "@/lib/schemas";
import { machineName, mergeRecords, sanitizeRecords } from "@/lib/records";
import { faultStats } from "@/lib/seed";
import type { Guide, Story } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { faultCode?: string; stories?: Story[]; extraRecords?: unknown; demo?: boolean };
  const code = body.faultCode?.trim();
  if (!code) return badRequest("faultCode is required");
  const stories = Array.isArray(body.stories) ? body.stories : [];
  const offline = buildGuide(code, stories);
  if (!offline) return NextResponse.json({ error: "No captured knowledge for this fault" }, { status: 404 });
  const stat = faultStats(mergeRecords(sanitizeRecords(body.extraRecords))).find((f) => f.faultCode === code);
  const linked = stories.filter((s) => s.extraction.faultCodes.includes(code));

  const user = [
    `Fault: ${code} ${stat ? `(${stat.description}) on ${machineName(stat.machineId)}, ${stat.occurrences}x in 12 months` : ""}`,
    `Stories:\n${JSON.stringify(linked.map((s) => ({ id: s.id, expertId: s.expertId, extraction: s.extraction })))}`,
  ].join("\n\n");

  return withFallback<Guide>(
    Boolean(body.demo),
    async () => ({ ...(await callLLM({ system: GUIDE_SYSTEM, user, schema: GuideSchema, effort: "medium", timeoutMs: 30_000, deadlineMs: 45_000 })), faultCode: code }),
    () => offline,
  );
}
