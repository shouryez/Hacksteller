import "server-only";
import { NextResponse } from "next/server";
import { hasClaude } from "./claude";
import type { ApiEnvelope, Source } from "./types";

/** Runs the Claude path unless Demo Mode is on or no key is set; falls back to the offline brain on any error. */
export async function withFallback<T>(
  demo: boolean,
  claudeFn: () => Promise<T>,
  offlineFn: () => T | Promise<T>,
): Promise<NextResponse<ApiEnvelope<T>>> {
  if (demo || !hasClaude()) {
    const source: Source = demo ? "demo" : "offline";
    return NextResponse.json({ data: await offlineFn(), source, note: demo ? "Demo Mode" : "No ANTHROPIC_API_KEY set" });
  }
  try {
    return NextResponse.json({ data: await claudeFn(), source: "claude" as Source });
  } catch (err) {
    console.error("[claude] falling back to offline brain:", err);
    return NextResponse.json({
      data: await offlineFn(),
      source: "offline" as Source,
      note: err instanceof Error ? err.message : "Claude call failed",
    });
  }
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}
