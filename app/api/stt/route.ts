import { NextResponse } from "next/server";
import { hasSarvam, sarvamStt } from "@/lib/sarvam";

export const maxDuration = 60;

/** Transcribes one audio chunk (under 30 s). For Hindi/Kannada it also returns an English translation. */
export async function POST(req: Request) {
  if (!hasSarvam()) return NextResponse.json({ error: "SARVAM_API_KEY not set" }, { status: 503 });
  const form = await req.formData();
  const file = form.get("file");
  const lang = String(form.get("lang") ?? "en-IN");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "file is required" }, { status: 400 });
  try {
    const original = await sarvamStt(file, lang === "en-IN" ? "transcribe" : "codemix", lang);
    const english = lang === "en-IN" ? original.transcript : (await sarvamStt(file, "translate", lang)).transcript;
    return NextResponse.json({ transcript: original.transcript, english, languageCode: original.languageCode });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "STT failed" }, { status: 502 });
  }
}
