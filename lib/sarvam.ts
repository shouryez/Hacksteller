import "server-only";

const BASE = "https://api.sarvam.ai";

export function hasSarvam(): boolean {
  return Boolean(process.env.SARVAM_API_KEY);
}

function headers(): Record<string, string> {
  return { "api-subscription-key": process.env.SARVAM_API_KEY ?? "" };
}

export type SttMode = "transcribe" | "translate" | "codemix";

/** Speech-to-text with Saaras v3. The REST endpoint accepts clips under 30 seconds. */
export async function sarvamStt(audio: Blob, mode: SttMode, languageCode: string) {
  const form = new FormData();
  form.append("file", audio, "clip.wav");
  form.append("model", "saaras:v3");
  form.append("mode", mode);
  form.append("language_code", languageCode);
  const res = await fetch(`${BASE}/speech-to-text`, { method: "POST", headers: headers(), body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `Sarvam STT failed (${res.status})`);
  return { transcript: String(json.transcript ?? ""), languageCode: String(json.language_code ?? languageCode) };
}

/** Text-to-speech with Bulbul v3. Returns WAV bytes. */
export async function sarvamTts(text: string, languageCode: string, speaker: string, pace = 1) {
  const res = await fetch(`${BASE}/text-to-speech`, {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json" },
    body: JSON.stringify({ text, target_language_code: languageCode, model: "bulbul:v3", speaker, pace }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `Sarvam TTS failed (${res.status})`);
  const audios: string[] = json.audios ?? [];
  if (!audios.length) throw new Error("Sarvam TTS returned no audio");
  return Buffer.from(audios[0], "base64");
}

/** Translates short text between English and Indian languages (used to localise offline answers). */
export async function sarvamTranslate(text: string, source: string, target: string): Promise<string> {
  const res = await fetch(`${BASE}/translate`, {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json" },
    body: JSON.stringify({ input: text.slice(0, 1800), source_language_code: source, target_language_code: target }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `Sarvam translate failed (${res.status})`);
  return String(json.translated_text ?? text);
}
