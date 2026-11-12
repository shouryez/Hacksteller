import "server-only";
import { NextResponse } from "next/server";
import { activeProvider } from "./llm";
import type { ApiEnvelope, Source } from "./types";

/** Runs the AI path (Gemini or Claude) unless Demo Mode is on or no key is set; falls back to the offline brain on any error. */
export async function withFallback<T>(
  demo: boolean,
  aiFn: () => Promise<T>,
  offlineFn: () => T | Promise<T>,
): Promise<NextResponse<ApiEnvelope<T>>> {
  const provider = activeProvider();
  if (demo || !provider) {
    const source: Source = demo ? "demo" : "offline";
    return NextResponse.json({ data: await offlineFn(), source, note: demo ? "Demo Mode" : "No AI key set" });
  }
  try {
    return NextResponse.json({ data: await aiFn(), source: provider as Source });
  } catch (err) {
    console.error(`[${provider}] falling back to offline brain:`, err);
    return NextResponse.json({
      data: await offlineFn(),
      source: "offline" as Source,
      note: friendly(err),
    });
  }
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function friendly(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/quota|rate/i.test(msg)) return "AI quota exceeded (free tier limit)";
  if (/high demand|overloaded|UNAVAILABLE/i.test(msg)) return "AI model overloaded";
  if (/timed out|timeout/i.test(msg)) return "AI took too long";
  return msg.slice(0, 120);
}
