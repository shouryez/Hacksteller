import "server-only";
import type { z } from "zod";
import { CLAUDE_MODEL, callClaude, hasClaude } from "./claude";
import { callGemini, geminiModels, hasGemini, type GeminiTuning } from "./gemini";

export type Provider = "gemini" | "claude";

/** Gemini when its key is set, otherwise Claude, otherwise none (offline brain). */
export function activeProvider(): Provider | null {
  if (hasGemini()) return "gemini";
  if (hasClaude()) return "claude";
  return null;
}

export function activeModel(): string {
  const p = activeProvider();
  return p === "gemini" ? geminiModels()[0] : p === "claude" ? CLAUDE_MODEL : "";
}

export async function callLLM<T extends z.ZodType>(
  opts: { system: string; user: string; schema: T; effort?: "low" | "medium" | "high" } & GeminiTuning,
): Promise<z.infer<T>> {
  const provider = activeProvider();
  if (provider === "gemini") return (await callGemini(opts)).data;
  if (provider === "claude") return callClaude(opts);
  throw new Error("No AI provider key set");
}
