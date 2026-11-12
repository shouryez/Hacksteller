# GhostWrench — Build Plan (HackStellar · PS-15)

> **"Raju has fixed these machines for 34 years. He retires in 23 days. Everything he knows leaves with him — unless we bottle it."**

GhostWrench captures a retiring technician's *spoken* repair knowledge, links it to the factory's fault records, turns it into searchable troubleshooting guides, and lets a junior technician **ask the "ghost" of the expert by voice** — with every answer backed by the original recording.

---

## 0. Know the brief, hit every word of it

PS-15 asks for three things. Every feature below maps to one of them, and the pitch deck should show this mapping on one slide.

| Brief says | GhostWrench feature |
|---|---|
| "captures technicians' **spoken** repair explanations" | **Capture Studio**: talk → live transcript → AI structures it → knowledge graph grows live |
| "connects them with **machine fault records**" | **Fault Record Linker**: CSV of fault logs; each story auto-linked to fault codes; graph nodes show "occurred 14×, 41 h downtime" |
| "converts them into **searchable troubleshooting guides**" | **Guides** (auto-built, printable, fuzzy search) + **Ask the Ghost** (voice Q&A with cited audio) |

The two features that make us *different* from every other team:

1. **Knowledge Risk Radar** — compares fault records against captured knowledge and shows what's **about to be lost**: "CNC L-04: fault E-311 happened 9× (41 h downtime), and nobody has explained how to fix it. Raju leaves in 23 days."
2. **Interview Mode** — the AI doesn't wait for the expert to talk; it **interviews him about the gaps**, and questions the ghost couldn't answer automatically join the interview queue. The system actively hunts for the knowledge most at risk.

---

## 1. The demo we're building toward (3 minutes)

Build *backwards* from this. If a feature doesn't appear in this script, it's P2.

1. **Hook (20 s).** Slide: photo of an old technician. "34 years. 23 days left. Factory records say *what* broke — 'E-217, reset, OK.' They never say *how* it was fixed."
2. **Risk Radar (20 s).** Open the app. Coverage is **62%**. Red card: *E-311 servo overheating — 9 occurrences, 41 h downtime, zero knowledge captured.*
3. **Interview Mode (50 s).** Click "Interview Raju about this." The AI asks a targeted question out loud. A teammate playing Raju answers in a natural, rambling way (in Kanglish/Hinglish for bonus points). Live transcript scrolls; on stop, **graph nodes pop in one by one** (symptom → cause → fix → tools → safety). Coverage jumps **62% → 78%**.
4. **Ask the Ghost (50 s).** Switch to the junior's view. Ask by voice, vaguely: *"Machine four is getting hot and the alarm keeps coming back."* The ghost answers **out loud**, in steps, shows confidence, and plays **the actual clip of Raju saying it 40 seconds ago**. Then ask something nobody has explained → it says *"Raju never covered this. I've added it to his interview list."* (Honesty beats hallucination — judges love this.)
5. **Guide + QR (25 s).** Open the auto-generated troubleshooting guide for E-311. Show the QR sticker "on the machine" — **hand a judge your QR printout; they scan it and the guide opens on their phone.**
6. **Close (15 s).** "Every factory has a Raju. GhostWrench makes sure his last day isn't the day his knowledge dies."

---

## 2. Stack (chosen for vibecoding speed + zero demo risk)

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js 15 (App Router) + TypeScript** | Frontend + API routes in one repo; one-command Vercel deploy |
| UI | **Tailwind CSS + shadcn/ui**, `lucide-react` icons, `framer-motion` | AI codegen produces these beautifully; dark "industrial" theme |
| Graph | **`react-force-graph-2d`** | Animated node pop-in, glow, zero config |
| State/storage | **Zustand** with `persist` → localStorage; audio blobs in **IndexedDB** via `idb-keyval` | No database, no backend state, nothing to break |
| Speech-to-text | **Web Speech API** (`webkitSpeechRecognition`, Chrome) — supports `en-IN`, `hi-IN`, `kn-IN` | Free, no key, gives live interim text (looks great) |
| Audio capture | **MediaRecorder** running alongside STT | Stores the clip so answers can cite real audio |
| Text-to-speech | Browser **`speechSynthesis`** (P0); ElevenLabs voice (P2) | Free and offline-capable |
| LLM | **Claude API** via `@anthropic-ai/sdk`, model **`claude-opus-5-5`**, structured outputs with Zod | Reliable JSON extraction; one call per feature |
| Search | **Fuse.js** for guide search | Instant fuzzy search, client-side |
| QR | `qrcode.react` | One component |
| Deploy | **Vercel** | HTTPS (required for the microphone), env var for the key |

**Key design decision: no vector DB, no RAG pipeline.** The whole knowledge base is tens of stories (a few thousand tokens). We pass *all* of it into every "Ask" call. It's simpler, more accurate, and impossible to misconfigure. If a judge asks about scale: "At 10,000 stories we'd add embeddings + a graph DB (Neo4j); for one retiring expert, full-context is strictly better."

### API key + cost
- Get a key at console.anthropic.com (add ~$5 credits). Put it in `.env.local` as `ANTHROPIC_API_KEY=...` and in Vercel project env vars. **Never commit it.**
- One extraction ≈ 3k tokens in / 1.5k out ≈ $0.04. The whole hackathon including rehearsals should cost under $5.

---

## 3. Data model

```ts
// lib/types.ts
type Expert = { id: string; name: string; years: number; retiresOn: string; photo?: string };
type Machine = { id: string; name: string; type: string; line: string };

type FaultRecord = {          // from data/fault_records.csv
  recordId: string; date: string; machineId: string; faultCode: string;
  description: string; downtimeMin: number; technician: string;
  resolutionNote: string;     // deliberately terse: "reset, ok", "replaced part"
};

type Story = {                // one recording = one story
  id: string; expertId: string; machineId: string;
  createdAt: string; language: "en-IN" | "hi-IN" | "kn-IN";
  transcript: string;
  audioKey?: string;          // IndexedDB key, or /audio/seed-*.mp3 for seeds
  extraction: StoryExtraction;
};

type StoryExtraction = {
  title: string;                         // "Spindle overload after humid weekends"
  faultCodes: string[];                  // ["E-217"]
  symptoms: { id: string; label: string }[];
  causes:   { id: string; label: string; symptomIds: string[] }[];
  fixes:    { id: string; label: string; causeIds: string[];
              steps: string[]; tools: string[]; safety: string[]; estMinutes: number }[];
  tribalTips: { text: string; quote: string }[];   // the gold: "don't trust the left gauge"
  confidence: "high" | "medium" | "low";
};

type AskResult = {
  spokenAnswer: string;        // 2–4 sentences, conversational, read aloud
  steps: string[];
  citedStoryIds: string[];
  confidence: "high" | "medium" | "low";
  notCovered: boolean;         // true → refuse + add to interview queue
  suggestedInterviewQuestion?: string;
};
```

**Knowledge graph** is derived client-side from all stories (never stored separately):
nodes = `Machine`, `FaultCode`, `Symptom`, `Cause`, `Fix`, `Tool`, `Expert`; edges = machine→fault, fault→symptom, symptom→cause, cause→fix, fix→tool, story→expert. De-duplicate by lower-cased label; the extraction prompt receives the existing labels so Claude reuses them (cheap entity resolution).

**Coverage metric** (drives the Risk Radar): for each machine, `coverage = Σ downtime of fault codes that have ≥1 linked Fix ÷ Σ downtime of all fault codes in records`. Weighting by downtime means the scary gaps rank first.

---

## 4. Screens

| Route | Screen | Priority |
|---|---|---|
| `/` | **Risk Radar** home: expert card with retirement countdown, overall coverage ring, per-machine coverage bars, red "knowledge at risk" cards sorted by downtime | P0 (simple) → P1 (polish) |
| `/capture` | **Capture Studio**: pick expert + machine + language → big mic button → live transcript + waveform → on stop: "Extracting…" → split view with **live graph** + extracted card | P0 |
| `/interview` | **Interview Mode**: queue of AI-generated questions about gaps; "Ask out loud" (TTS) → answer → feeds into Capture flow | P1 |
| `/ask` | **Ask the Ghost**: junior view, mic or text → spoken answer, steps, confidence badge, source cards with ▶ play original clip | P0 |
| `/graph` | Full-screen knowledge graph, filter by machine, click node → linked stories | P1 (the graph also lives inside /capture at P0) |
| `/guides` and `/guides/[faultCode]` | Searchable guide list; guide page = steps, tools, safety callouts, tribal tips, fault stats, sources with audio, **QR code**, Print button | P0 (one guide page) → P1 (search, QR, print) |

---

## 5. API routes (all `POST`, all server-side so the key never reaches the browser)

| Route | Input | Output | Notes |
|---|---|---|---|
| `/api/extract` | transcript, machine, faultCodes in records for this machine, existing node labels | `StoryExtraction` | effort `medium` |
| `/api/ask` | question, all stories (compact JSON), fault stats | `AskResult` | effort `low` for speed |
| `/api/interview` | top gaps (fault code, description, occurrences, downtime) + unanswered junior questions | `{ questions: { faultCode, question, why }[] }` | effort `low` |
| `/api/guide` | faultCode + all linked stories + records | merged guide JSON (dedupe steps across stories, order them, keep sources) | cache result in the store; effort `medium` |

### The one pattern every route uses

```ts
// lib/claude.ts
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

export async function callClaude<T extends z.ZodTypeAny>(opts: {
  system: string; user: string; schema: T; effort?: "low" | "medium" | "high";
}): Promise<z.infer<T>> {
  const res = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    output_config: { effort: opts.effort ?? "medium", format: zodOutputFormat(opts.schema) },
  });
  if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("No structured output");
  return res.parsed_output;
}
```

Notes for whoever vibecodes this:
- On `claude-opus-5-5` thinking is always on — **don't** send `thinking: {type: "disabled"}` or `budget_tokens` (both return 400). Speed is controlled with `output_config.effort`.
- No assistant-message prefill (400). Structured outputs handle the JSON.
- Every route wraps the call in try/catch and returns the matching **demo fallback** JSON on failure (see §8).

### Prompts (copy into `lib/prompts.ts`)

**Extraction system prompt**
```
You convert a factory technician's spoken, rambling repair explanation into structured
troubleshooting knowledge. The transcript may mix English with Hindi or Kannada and contain
speech-recognition errors; infer intent, and write all output fields in clear English.

Rules:
- Extract only what the technician actually said. Never invent steps, tools, or values.
- Link the story to fault codes from the provided list when the description matches; leave
  faultCodes empty rather than guess.
- Reuse an existing node label from the provided list whenever it means the same thing.
- "tribalTips" are the most valuable output: unwritten rules of thumb, warnings, things the
  manual gets wrong. Include the technician's original words in "quote".
- Every fix lists safety precautions the technician mentioned, plus lockout/tagout if he
  describes opening or touching moving or pressurised parts.
- confidence = how complete and specific the explanation was.
```

**Ask system prompt**
```
You are GhostWrench, an AI assistant that answers a junior technician's question using ONLY
the recorded knowledge of senior technicians provided below. You speak plainly, like an
experienced colleague on the shop floor.

Rules:
- Answer only from the provided stories. Cite every story you used in citedStoryIds.
- If the stories do not cover the question, set notCovered=true, say honestly that no senior
  technician has explained this yet, and write suggestedInterviewQuestion: the one question
  to ask the expert that would close this gap.
- spokenAnswer: 2–4 short sentences meant to be read aloud. Put the details in steps.
- Always surface safety warnings from the cited stories before the first step.
```

**Interview system prompt**
```
You are preparing an interview with a retiring technician. Given fault codes that occur
often in the records but have no captured fix, write one specific, friendly question per gap
that will make the technician tell the full story: symptoms, what he checks first, the real
cause, the fix, tools, and what the manual gets wrong. Mention the fault's history
("this happened 9 times last year") so the question feels grounded. Max 25 words each.
```

---

## 6. Seed data (build this first — the demo depends on it)

Put in `data/` and load into the store on first visit (with a "Reset demo" button in the header).

- `experts.json` — **Raju Gowda**, 34 yrs, retires in 23 days (compute from today); **Meena Iyer**, 12 yrs (gives the radar a "single point of failure" angle: knowledge only Raju has).
- `machines.json` — `L-04` CNC Lathe, `HP-02` Hydraulic Press, `IM-07` Injection Moulding, `CV-01` Conveyor.
- `fault_records.csv` — ~60 rows over 12 months. Ask the coding AI to generate it with these rules: codes `E-217`, `E-311` (L-04), `H-102` (HP-02), `Q-330` (IM-07), `C-045` (CV-01) plus 3–4 rare codes; `resolutionNote` deliberately useless ("reset ok", "adjusted", "checked, fine"). Make `E-311` frequent with high downtime and **no seed story** — it's the gap we close live.
- `stories.json` — the 4 seed stories below, **pre-extracted** (run `/api/extract` once, save the output, commit it), so the app looks alive before the demo starts.
- `public/audio/seed-*.mp3` — record each seed transcript in a teammate's voice (30–60 s each, phone voice memo is fine).

> 🔥 **High-impact optional move:** your college has a mechanical workshop. Spend 15 minutes recording a real lab technician explaining one machine fix (with permission). Use it as a seed story and say so in the pitch: "This is a real technician from our own workshop." Authenticity wins rooms.

### Seed transcripts (deliberately messy, like real speech)

**S1 — L-04 CNC Lathe, E-217 spindle overload**
> "See, E-217 comes mostly Monday morning, after the weekend. Everyone just presses reset, reset, reset — don't do that, you'll burn the drive. What happens is humidity, the coolant gets diluted, concentration drops, and the chips start sticking on the tool, so the spindle loads up. First thing, take the refractometer, check the coolant — it should be six to eight percent. If it's like four, top up concentrate. Then clean the chip conveyor, mostly it's jammed at the back corner. Ten mm Allen key for the cover. Takes twenty minutes. The manual says check the spindle bearings — ninety percent of the time it's not the bearings."

**S2 — HP-02 Hydraulic Press, H-102 slow ram / pressure drop**
> "When the ram is slow and you hear a whining sound, a high whine, that is air in the system, not the pump. People order a new pump for fifty thousand rupees, no need. Lockout the press first, always, it's stored pressure. Bring the ram fully up, then bleed from the top valve slowly till the oil comes without bubbles. And one more thing — the left pressure gauge reads about ten bar high. It's been like that for years. Always trust the right one."

**S3 — IM-07 Injection Moulding, Q-330 short shots**
> "Short shots, parts not filling fully. In monsoon this happens a lot. The dryer timer says four hours but in rainy season you give six hours, the material is holding moisture. If drying is fine and still short shots, check heater band number three on the nozzle — it becomes loose. Tighten it only when the machine is cold, never hot, you'll strip the screw and burn your hand also."

**S4 — CV-01 Conveyor, C-045 belt misalignment trip**
> "C-045 means belt is drifting and the sensor trips. Young fellows turn the tracking idler too much. Only quarter turn at a time, then wait — three full rotations of the belt — then see. And before touching anything, look at the tail pulley. Most of the time it's spilled material stuck on the pulley making it uneven. Clean it with the scraper, half the time problem is gone."

**Live demo story (do NOT seed) — L-04, E-311 servo overheating** — the "Raju" teammate rehearses a natural answer: fan filter clogged with oil mist → clean filter monthly, not quarterly as the manual says; check the cabinet door seal; reduce feed rate on long cycles in summer afternoons.

---

## 7. Build timeline

Team roles (for 3 people; with 2, merge B+C; with 4, split A into "Capture/Graph" and "Ask/Guides"):

- **A — Frontend lead:** screens, graph, animations, polish
- **B — AI + voice:** API routes, prompts, Web Speech, MediaRecorder, TTS, demo fallbacks
- **C — Data + story + pitch:** seed data, audio recordings, slides, demo script, rehearsal, QR printouts

> ⏰ **Check your slot:** 3rd sem evaluates **online, 12 Nov, 7 PM**; 1st & 5th sem evaluate **offline, 13 Nov, 11 AM** (finals 4:30 PM). If you're 3rd sem, use the **compressed track** (P0 only, ~6 h). Otherwise run the full ~10 h track and keep the morning of the 13th for rehearsal only — **no new features after 9 AM.**

| Hour | A — Frontend | B — AI + voice | C — Data + pitch | ✅ Checkpoint |
|---|---|---|---|---|
| 0–1 | Scaffold Next.js + Tailwind + shadcn, dark theme, nav, empty pages | `lib/claude.ts`, Zod schemas, `/api/extract` working via curl | Write `data/*.json` + generate `fault_records.csv`; record seed audio | Extract returns valid JSON for S1 |
| 1–2.5 | Zustand store + seed loader; Capture Studio UI (mic button, transcript panel) | Web Speech hook (`useSpeechRecognition`) + MediaRecorder hook; language picker | Pre-extract 4 seed stories → `stories.json` | Speak → transcript → extraction card on screen |
| 2.5–4 | Graph derivation + `react-force-graph-2d` with pop-in animation, node colors by type | `/api/ask` + Ask screen logic; `speechSynthesis` playback; citation → play audio | Draft slides (hook, brief mapping, architecture, impact) | **P0 core loop works end-to-end** |
| 4–5.5 | Guide page `/guides/[faultCode]` + Fuse.js search list | `/api/guide`, `/api/interview`; demo fallback JSONs; error states | Coverage metric + Risk Radar data | Guide for E-217 renders |
| 5.5–7 | Risk Radar home (coverage ring, at-risk cards), countdown | Interview Mode: queue, TTS question, answer → extract → coverage update; `notCovered` → queue | Rehearse demo script #1, time it | **Full demo flow runs once** |
| 7–8.5 | QR codes + print stylesheet; polish animations, loading states | Deploy to Vercel, set env var, test mic on HTTPS + phone | Print QR stickers; record backup demo video | Deployed URL works on a phone |
| 8.5–10 | Bug bash + P2 picks only if everything is green | Freeze; capture real responses into `public/demo/` for Demo Mode | Rehearse ×3, judge Q&A drill | **Code freeze** |

**Compressed track (≈6 h):** hours 0–4 as above, then Guide page (no search), then deploy + Demo Mode + rehearsal. Skip Interview Mode and Radar polish — instead show coverage as a single number that changes after the live recording.

### Priority cut-line

- **P0 (must ship):** seed data · Capture (voice → transcript → extraction → graph) · fault-code linking · Ask the Ghost with spoken answer + cited audio + `notCovered` honesty · one guide page · Demo Mode fallback · Vercel deploy
- **P1 (makes us win):** Risk Radar with coverage · Interview Mode · guide search + print + **QR** · multilingual capture (just the language dropdown — Claude already writes English output) · full-screen graph view
- **P2 (only if green):** ElevenLabs voice for the ghost (with consent label) · Whisper fallback for non-Chrome browsers · PWA "shop-floor mode" (big buttons, gloves-friendly) · export guides as PDF bundle

---

## 8. Demo-proofing (do not skip)

Live demos die from Wi-Fi, mic permissions and API hiccups. Defend against all three:

1. **Demo Mode** (`?demo=1` or a header toggle): every API route falls back to `public/demo/*.json` captured from real runs; the live E-311 story has a pre-recorded transcript you can "play" if the mic fails. The audience can't tell the difference.
2. **Bring a phone hotspot.** Never rely on venue Wi-Fi.
3. **Chrome only**, mic permission granted in advance, **external USB/collar mic** if you have one (seminar halls echo).
4. **Backup screen recording** of the full demo on the laptop desktop, ready to play.
5. **Reset demo** button restores seed state between runs (rehearse with it).
6. Loading states that look intentional ("Raju's knowledge is being structured…" + skeleton graph) so a 4-second API call feels like a feature.

---

## 9. Vibecoding playbook

Work in this order; paste each prompt into Claude Code (or Cursor). `CLAUDE.md` in the repo gives the AI the project context automatically. **Commit after every working step** so you can always roll back.

1. *"Read PLAN.md. Scaffold the Next.js 15 + TypeScript + Tailwind + shadcn/ui app described in §2 with the routes in §4 as placeholder pages, a dark industrial theme (charcoal + safety-orange accents), and a top nav. Add lib/types.ts from §3."*
2. *"Implement lib/claude.ts and /api/extract exactly as in §5 using the extraction prompt in lib/prompts.ts. Add a demo fallback. Give me a curl command to test it with seed transcript S1."*
3. *"Create the seed data in §6: experts, machines, ~60 fault records CSV following the rules listed, and a Zustand store (persisted) that loads them on first visit, plus a Reset demo button."*
4. *"Build /capture: hooks useSpeechRecognition (Web Speech API, interim results, language en-IN/hi-IN/kn-IN) and useRecorder (MediaRecorder → IndexedDB via idb-keyval). Big mic button, live transcript, on stop call /api/extract and save the Story."*
5. *"Derive the knowledge graph from stories as in §3 and render it with react-force-graph-2d beside the capture panel. New nodes should pop in one at a time with a glow, colored by node type."*
6. *"Build /api/ask and the /ask screen: mic or text input, spoken answer with speechSynthesis, steps list, confidence badge, source cards that play the original audio clip. If notCovered, show the honest message and add the suggested question to the interview queue."*
7. *"Build /api/guide and /guides/[faultCode] (steps, tools, safety callouts, tribal tips, fault stats from the CSV, sources with audio, QR code to this page, print stylesheet) and /guides with Fuse.js search."*
8. *"Build the Risk Radar home and Interview Mode from §4 using the coverage metric in §3."*
9. *"Add Demo Mode from §8 to every API route and the capture flow."*

Vibecoding rules that save hours: one feature per prompt · test in the browser after every prompt · when something breaks, paste the exact error back · never let the AI "refactor everything" after hour 6.

---

## 10. Pitch deck (6 slides max)

1. **Hook** — photo, "34 years, 23 days left", the "reset ok" fault record.
2. **The problem in numbers** — retiring workforce, undocumented tribal knowledge, downtime cost. (Use real, cited statistics only; don't invent figures.)
3. **Brief → feature mapping** (the table in §0).
4. **Live demo** (switch to app).
5. **How it works** — architecture: Voice → Web Speech → Claude structured extraction → Knowledge graph ⇄ Fault records → Guides / Ask / Radar / Interview.
6. **Impact + next steps** — any factory, any language; roadmap: smart-glasses hands-free mode, multi-expert consensus, ERP/CMMS integration.

### Judge Q&A prep
- **"What if the AI hallucinates a repair step?"** — It answers only from recorded stories, cites them, plays the original audio, and says "not covered" instead of guessing. Safety warnings are always surfaced first.
- **"Isn't this just ChatGPT on documents?"** — No documents exist; that's the point. We create the knowledge from speech, link it to fault records, and measure what's still missing — then go get it with Interview Mode.
- **"Privacy / consent for voice?"** — Recorded with consent; the ghost voice is clearly labelled as an AI reconstruction; data stays in the company's deployment.
- **"How does it scale?"** — Full-context works for one expert; for a plant: embeddings + graph database, CMMS integration, multi-expert conflict detection.
- **"Why a graph?"** — Repairs are causal chains (symptom → cause → fix). A graph lets two technicians' stories reinforce each other and makes gaps measurable.

---

## 11. Definition of done

- [ ] A teammate can speak a messy story and see the graph grow within ~10 s
- [ ] Ask the Ghost answers by voice, cites a story, and plays its clip
- [ ] An uncovered question gets an honest "not covered" + lands in the interview queue
- [ ] Coverage visibly rises after the live E-311 story
- [ ] Guide page for every seeded fault code, printable, with QR that opens on a phone
- [ ] Works on the deployed HTTPS URL, on a hotspot, with Demo Mode as backup
- [ ] Demo rehearsed 3× under 3 minutes; backup video ready
