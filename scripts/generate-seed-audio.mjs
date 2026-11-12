// Generates seed audio clips with Sarvam Bulbul v3 TTS.
// Run: SARVAM_API_KEY=... node scripts/generate-seed-audio.mjs
import { readFileSync, writeFileSync } from "node:fs";

const key = process.env.SARVAM_API_KEY;
if (!key) throw new Error("Set SARVAM_API_KEY");

const experts = JSON.parse(readFileSync("data/experts.json", "utf8"));
const stories = JSON.parse(readFileSync("data/stories.json", "utf8"));
const live = JSON.parse(readFileSync("data/demo/live-story.json", "utf8"));
const voiceOf = (id) => experts.find((e) => e.id === id).voice;

const jobs = [
  ...stories.map((s) => ({ file: `public${s.audioUrl.replace(".mp3", ".wav")}`, text: s.transcript, voice: voiceOf(s.expertId) })),
  { file: `public${live.audioUrl.replace(".mp3", ".wav")}`, text: live.transcript, voice: voiceOf(live.expertId) },
];

for (const job of jobs) {
  const res = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: { "api-subscription-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text: job.text, target_language_code: "en-IN", model: "bulbul:v3", speaker: job.voice, pace: 0.95 }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${job.file}: ${JSON.stringify(json)}`);
  writeFileSync(job.file, Buffer.from(json.audios[0], "base64"));
  console.log("wrote", job.file);
}
