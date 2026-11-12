import { NextResponse } from "next/server";
import { hasSarvam, sarvamTts } from "@/lib/sarvam";

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!hasSarvam()) return NextResponse.json({ error: "SARVAM_API_KEY not set" }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { text?: string; lang?: string; voice?: string; pace?: number };
  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
  try {
    const wav = await sarvamTts(text.slice(0, 2400), body.lang ?? "en-IN", body.voice ?? "ratan", body.pace ?? 1);
    return new NextResponse(new Uint8Array(wav), { headers: { "content-type": "audio/wav", "cache-control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "TTS failed" }, { status: 502 });
  }
}
