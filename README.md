# GhostWrench 👻🔧

**HackStellar PS-15 · "The Retiring Technician"**: voice-first knowledge capture for factory experts who are about to retire.

Raju has fixed these machines for 34 years and retires in 23 days. GhostWrench lets him *talk*. It turns his rambling explanations into a knowledge graph linked to the factory's fault records, and shows which knowledge is still missing. It then interviews him about the gaps and lets juniors ask his "ghost" by voice, with every answer backed by the original recording.

The full build plan and pitch strategy are in [PLAN.md](PLAN.md).

## Run it

```bash
npm install
cp .env.example .env.local   # add keys (both optional)
npm run dev                  # http://localhost:3000  (use Chrome for voice)
```

| Key | What it unlocks | Without it |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude (`claude-opus-5-5`) structures any story, answers any question, writes interview questions, and merges guides | The **offline brain** handles it: rehearsed and seed stories extract perfectly, and Ask uses keyword retrieval with honest "not covered" refusals (Sarvam translates its answers into Hindi/Kannada when that key is set) |
| `SARVAM_API_KEY` | Sarvam Saaras v3 speech-to-text (Hindi, Kannada, code-mixed) and Bulbul v3 voices (Raju's ghost speaks in an Indian voice, including Kannada/Hindi answers) | The browser's Web Speech API and `speechSynthesis` |

The header shows which engines are live. **Demo Mode** (header toggle) skips all live AI calls. Use it if the venue Wi-Fi dies.

### Deploy (Vercel)
Import the repo in Vercel, add the two env vars, and deploy. The HTTPS URL is required for the microphone on phones, and the guide QR codes point to it.

## Features

| Screen | What it does |
|---|---|
| **Intro** `/story` | Full-screen cinematic opener for the pitch (auto-plays; Space/→ to advance) |
| **Risk Radar** `/` | Retirement countdown, downtime-weighted coverage, gaps ranked by downtime, and the ₹ impact of captured vs missing knowledge (editable cost per downtime hour) |
| **Capture** `/capture` | Talk → live captions → Sarvam transcription → structured story → knowledge graph grows node by node → coverage delta |
| **Interview** `/interview` | AI questions about each gap plus every question the ghost couldn't answer; read aloud, record the answer, gap closes |
| **Ask the Ghost** `/ask` | Voice or text; spoken answer in English/Hindi/Kannada, safety first, steps, cited original recording; honest refusal + auto-queued interview question |
| **Guides** `/guides` | Fuzzy search; each guide has a tap-to-tick checklist, print view and an offline QR (`/g`) |
| **Vault** `/library` | Every recording: search, filter, play, inspect, delete, export/import JSON |
| **Graph** `/graph` | Full knowledge graph with machine filters; click a node to hear its sources |

Also: presenter cue-card (press **P**), toasts, Demo Mode, installable PWA (manifest + icons), styled 404/error pages, works down to 320 px wide.

## The 3-minute demo

0. **Intro** (`/story`): let it play, then click **Begin**. Press **P** any time for the cue-card.
1. **Risk Radar** (`/`): Raju retires in 23 days. Coverage is **52%**, and E-311 (servo over-temperature, 33 h downtime) has no captured fix. Point at "records say 'reset ok'" next to Raju's real tip.
2. Click **Interview Raju about the biggest gap**. Press **Ask aloud** so the AI asks the question.
3. A teammate playing Raju answers into the mic. If anything goes wrong, use **Rehearsed demo story (E-311)**, which plays Raju's recording with a live transcript. The graph grows node by node, and coverage jumps from **52% to 86%**.
4. **Ask the Ghost**: tap "Machine four is getting hot…". The ghost answers aloud, safety first, with steps, and plays Raju's clip as proof. Then tap "tool changer not indexing", and it honestly refuses and adds the question to the interview list.
5. **Guide E-311**: tap the QR code to enlarge it, and a judge scans it with their phone. The whole guide is compressed *inside* the QR, so it opens offline with no app.

Use **Reset** (↺ in the header) between rehearsals.

## Quality checks

```bash
npm run lint && npm test && npm run build
```

`npm test` runs Vitest over the logic the demo depends on: offline answers and refusals, coverage maths, graph gaps, guide merging, the QR payload and the impact numbers.

## How it works

```
Voice ─▶ Web Speech (live captions) + MediaRecorder
      ─▶ Sarvam Saaras v3 (chunks < 30 s, transcribe + translate)
      ─▶ /api/extract ─ Claude structured output ─▶ Story {symptoms, causes, fixes, tools, safety, tribal tips}
                                                    │
fault_records.csv ─▶ coverage (downtime-weighted) ◀─┤─▶ knowledge graph (react-force-graph)
                                                    ├─▶ /api/ask      ─▶ answer + cited stories + original audio ─▶ Bulbul v3 voice
                                                    ├─▶ /api/interview ─▶ questions for gaps + unanswered junior questions
                                                    └─▶ /api/guide    ─▶ merged guide ─▶ print / QR (deflate in URL fragment)
```

- There's no database and no vector store. Stories live in the browser (Zustand + localStorage, audio in IndexedDB), and the entire knowledge base goes to Claude in full on each call.
- Every AI route falls back to `lib/offline.ts` on error, without a key, or in Demo Mode.

## Project map

| Path | What |
|---|---|
| `app/` | Pages: radar `/`, `/capture`, `/interview`, `/ask`, `/guides`, `/guides/[code]`, `/graph`, `/g` (QR phone view) and `app/api/*` routes |
| `components/CaptureStudio.tsx` | Record → transcribe → extract → graph + coverage delta |
| `lib/claude.ts`, `lib/prompts.ts`, `lib/schemas.ts` | Claude calls (structured outputs via Zod, server-side refusal fallback) |
| `lib/sarvam.ts`, `lib/audio.ts` | Sarvam STT/TTS, WAV chunking, IndexedDB audio |
| `lib/offline.ts` | Offline brain |
| `lib/impact.ts` | Avoidable / at-risk downtime and ₹ impact |
| `tests/` | Vitest suite |
| `data/` | Experts, machines, 65 fault records, 4 seed stories, rehearsed E-311 story |
| `scripts/` | `generate-fault-records.mjs`, `generate-seed-audio.mjs` (Sarvam TTS → wav; convert to mp3 with ffmpeg) |
