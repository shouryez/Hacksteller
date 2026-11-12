import "server-only";
import { z } from "zod";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Tried in order; a model that is overloaded (429/5xx), times out, or is retired for this key (404)
 * hands over to the next one. The 2.5 models are kept last for older keys that can still use them.
 */
export function geminiModels(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const chain = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.5-flash"];
  return [...new Set([...(preferred ? [preferred] : []), ...chain])];
}

export function hasGemini(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

const RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);
/** The model exists in the listing but this key can't use it ("no longer available to new users"). */
const UNAVAILABLE = new Set([403, 404]);

/** Models that recently hit a quota limit or were overloaded are skipped until this time (ms epoch). */
const coolingUntil = new Map<string, number>();
function coolDown(model: string, status: number) {
  const ms = UNAVAILABLE.has(status) ? 6 * 60 * 60_000 : status === 429 ? 60_000 : 30_000;
  coolingUntil.set(model, Date.now() + ms);
}

/** One structured-output call to Gemini; the reply is validated against the same Zod schema. */
export type GeminiTuning = {
  /** off = fastest; light = a little reasoning (accuracy-sensitive but interactive); auto = model decides. */
  thinking?: "off" | "light" | "auto";
  /** Per-model attempt timeout. */
  timeoutMs?: number;
  /** Give up on Gemini (and let the offline brain answer) once this much time has passed. */
  deadlineMs?: number;
};

export async function callGemini<T extends z.ZodType>(
  opts: { system: string; user: string; schema: T } & GeminiTuning,
): Promise<{ data: z.infer<T>; model: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const { $schema: _drop, ...jsonSchema } = z.toJSONSchema(opts.schema) as Record<string, unknown>;
  void _drop;
  let lastError: unknown = null;
  const started = Date.now();
  const deadline = opts.deadlineMs ?? 45_000;

  const all = geminiModels();
  const ready = all.filter((m) => (coolingUntil.get(m) ?? 0) < Date.now());
  for (const model of ready.length ? ready : all) {
    const remaining = deadline - (Date.now() - started);
    if (remaining < 2_000) break;
    const generationConfig: Record<string, unknown> = { responseMimeType: "application/json", responseJsonSchema: jsonSchema };
    // Gemini models think by default; trim it for interactive calls (2.5 takes a budget, 3.x a level).
    if (opts.thinking && opts.thinking !== "auto") {
      generationConfig.thinkingConfig = model.startsWith("gemini-2.5")
        ? { thinkingBudget: opts.thinking === "off" ? 0 : 1024 }
        : { thinkingLevel: opts.thinking === "off" && model.includes("lite") ? "minimal" : "low" };
    }
    if (lastError) console.warn("[gemini] falling back to", model, "after:", lastError instanceof Error ? lastError.message : lastError);
    try {
      const res = await fetch(`${BASE}/${model}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: opts.system }] },
          contents: [{ role: "user", parts: [{ text: opts.user }] }],
          generationConfig,
        }),
        signal: AbortSignal.timeout(Math.min(opts.timeoutMs ?? 30_000, remaining)),
      });
      const json = await res.json();
      if (!res.ok) {
        lastError = new Error(`${model}: ${String(json?.error?.message ?? res.status).split(". ")[0]}`);
        // A model that rejects our thinking setting just hands over to the next one.
        const badThinking = res.status === 400 && /thinking/i.test(String(json?.error?.message));
        if (RETRYABLE.has(res.status) || UNAVAILABLE.has(res.status) || badThinking) {
          coolDown(model, res.status);
          continue;
        }
        throw lastError;
      }
      const cand = json.candidates?.[0];
      const text: string = (cand?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("");
      if (!text) {
        lastError = new Error(`${model}: empty response (${cand?.finishReason ?? json.promptFeedback?.blockReason ?? "unknown"})`);
        continue;
      }
      const parsed = opts.schema.safeParse(JSON.parse(text));
      if (!parsed.success) {
        lastError = new Error(`${model}: response did not match schema`);
        continue;
      }
      return { data: parsed.data as z.infer<T>, model };
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        coolDown(model, 503);
        lastError = new Error(`${model}: timed out`);
      } else lastError = err;
      if (err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError" || err instanceof SyntaxError)) continue;
      throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("All Gemini models failed");
}
