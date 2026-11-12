"use client";
import { get, set, del } from "idb-keyval";
import type { Story } from "./types";

export async function saveAudio(key: string, blob: Blob): Promise<void> {
  await set(`audio:${key}`, blob);
}

export async function deleteAudio(key: string): Promise<void> {
  await del(`audio:${key}`);
}

const urlCache = new Map<string, string>();

/** Playable URL for a story's original recording, or null if it has none. */
export async function storyAudioUrl(story: Story): Promise<string | null> {
  if (story.audioUrl) return story.audioUrl;
  if (!story.audioKey) return null;
  const cached = urlCache.get(story.audioKey);
  if (cached) return cached;
  const blob = await get<Blob>(`audio:${story.audioKey}`);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(story.audioKey, url);
  return url;
}

/** Decodes any recorded blob and splits it into 16 kHz mono WAV chunks (Sarvam's REST STT takes < 30 s). */
export async function toWavChunks(blob: Blob, chunkSeconds = 25): Promise<Blob[]> {
  const ctx = new AudioContext();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  await ctx.close();
  const rate = 16000;
  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const mono = (await offline.startRendering()).getChannelData(0);
  const per = chunkSeconds * rate;
  const chunks: Blob[] = [];
  for (let i = 0; i < mono.length; i += per) {
    const slice = mono.subarray(i, Math.min(mono.length, i + per));
    if (slice.length > rate * 0.5) chunks.push(encodeWav(slice, rate));
  }
  return chunks;
}

function encodeWav(samples: Float32Array, rate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}

/** Sends a recording to Sarvam (via /api/stt) chunk by chunk. */
export async function transcribeWithSarvam(blob: Blob, lang: string): Promise<{ transcript: string; english: string }> {
  const chunks = await toWavChunks(blob);
  const results = await Promise.all(
    chunks.map(async (chunk) => {
      const form = new FormData();
      form.append("file", chunk, "clip.wav");
      form.append("lang", lang);
      const res = await fetch("/api/stt", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Transcription failed");
      return json as { transcript: string; english: string };
    }),
  );
  return {
    transcript: results.map((r) => r.transcript).join(" ").trim(),
    english: results.map((r) => r.english).join(" ").trim(),
  };
}
