# GhostWrench — Demo Guide

## The story in one breath

**Raju** is a technician who has fixed the factory's machines for 34 years. He retires in **23 days**.
The factory's fault log only says *what* broke ("E-217, reset ok"), never *how* he fixed it.
**GhostWrench** lets Raju just *talk*. AI turns his talk into repair guides, links them to the fault log,
shows what knowledge is still missing, and lets junior technicians ask his "ghost" for help by voice.

That's PS-15: capture spoken knowledge → connect to fault records → searchable troubleshooting guides.

---

## Before you present (5 minutes)

1. Run `npm run build` then `npm start`, open **http://localhost:3000** in **Chrome**.
2. Allow the **microphone** when Chrome asks.
3. Click **↺** (top right) to reset to the starting data. Do this before every rehearsal.
4. Check the header: green **Gemini** = AI on; green **Sarvam voice** = Indian voice on.
   Grey "Offline brain" still works (the scripted demo is safe either way).
5. Phone hotspot on, laptop volume up, Chrome full screen (F11).
6. Press **P** any time to open the **presenter cue-card** (bottom-left) — it tells you what to do on each page.

---

## The 3-minute demo script

| # | Where | Click / do | Say | Judges see |
|---|---|---|---|---|
| 1 | `/story` (footer: "Play the intro") | Let it play, then **Begin** | "34 years. 23 days. The log says 'reset ok'. It never says how." | Full-screen cinematic intro |
| 2 | **Risk Radar** (home) | Point at the ring and the red list | "Only **52%** of last year's downtime has a written fix. E-311 cost 33 hours, and nobody has written down how to fix it. That's ₹11 lakh at risk." | Coverage ring, gaps ranked by downtime, ₹ impact |
| 3 | Click **Interview Raju about the biggest gap** | Click **Ask aloud** → the AI asks Raju the question | "The AI doesn't wait for Raju to talk. It interviews him about what's about to be lost." | Question read aloud |
| 4 | Same page | Click the **big orange mic**, a teammate speaks as Raju — **or** click **Rehearsed demo story (E-311)** (safe option) | "He just talks, the way he'd teach an apprentice." | Live transcript, graph nodes popping in, then **Coverage 52% → 86%** |
| 5 | Same page, scroll down | Point at **Completeness check** and the story card | "It even notices what he forgot to say and asks the follow-up." | Symptoms → causes → fixes, safety, tribal tips, "Corrects the manual" |
| 6 | **Fault Log** | Pick **E-311** in the dropdown → **Simulate alarm** | "Now the machine faults on the night shift. Raju's gone home." | Siren, red alarm card, **the ghost speaks Raju's fix out loud** |
| 7 | **Ask** | Tap "Machine four is getting hot…" | "A junior asks the way he'd ask on the floor." | Spoken answer, safety first, steps, **Hear Raju say it** (proof) |
| 8 | **Ask** | Tap "The tool changer on the lathe…" | "When nobody has explained something, it says so. It never guesses." | Honest refusal + "Added to Raju's interview list" |
| 9 | **Guides → E-311** | Tick 2–3 steps → **Log this fix** → **Save to fault log**. Tap the **QR**, a judge scans it | "The log finally says *how* it was fixed. And the whole guide fits inside this QR, works offline." | Manual-vs-expert comparison, repair time, QR opens on judge's phone* |
| 10 | **Drill** | Hand a judge the mouse → **Start the drill** | "Would *you* fix it the way Raju would?" | Quiz with real traps from the manual |
| 11 | Footer → **Handover report** | Scroll it | "Every factory has a Raju. His last day shouldn't be the day his knowledge dies." | One-page printable report |

\* The QR opens on a phone only when the app is deployed (Vercel). On localhost, skip the scan and just show the QR.

**Short on time?** Do steps 2, 4, 6, 7, 8 — that's the core loop.

---

## What every page does and how to test it

### Risk Radar `/` (home)
- **Does:** shows how much of last year's machine downtime has a recorded fix, which faults have none, and what that's worth in ₹.
- **Test:** start at **52%**. After capturing E-311, it should show **86%**, and E-311 disappears from the gap list.
- Change the "cost of 1 h downtime" number → the ₹ figures update.
- **Simulate a live alarm** button → alarm card for a fault Raju already explained.

### Capture `/capture`
- **Does:** records an expert talking (English, Hindi, Kannada or mixed), turns it into structured knowledge, grows the graph.
- **Test (no mic):** **Type instead** → choose machine L-04 → paste:
  *"Tool changer not indexing, E-105. First check air pressure on the regulator, six bar, the screen shows wrong. Then wipe the proximity sensor with a dry cloth, never solvent. Lockout first. Twenty minutes."* → **Structure it**.
  You should get fault **E-105**, steps, safety, tips, and coverage goes up.
- **Test (mic):** press the orange mic, talk, press stop.
- **Completeness check:** shows which of the 7 parts (code, symptoms, cause, steps, tools, safety, tribal tip) are missing, with a **Record answer** button for each.

### Interview `/interview`
- **Does:** lists questions for Raju about every gap, plus questions juniors asked that nobody could answer.
- **Test:** pick a question → **Ask aloud** → answer with the mic or the rehearsed story. Gap questions disappear once captured.

### Ask `/ask`
- **Does:** juniors ask by voice or text; the ghost answers only from recordings, with the original audio as proof.
- **Test:**
  - "The press ram is slow and there's a whining noise" → answer from Raju's HP-02 story.
  - "Machine four is getting hot…" → **before** E-311 capture: honest "not covered"; **after**: Raju's E-311 fix.
  - Change **Answer language** to ಕನ್ನಡ / हिंदी → answer in Kannada/Hindi, spoken.
- The badge on each answer says who answered: **Gemini** or **Offline brain** (hover ⓘ to see why).

### Guides `/guides`
- **Does:** one troubleshooting guide per fault code, searchable ("coolant", "whine", "E-217").
- **On a guide:** tick-off checklist · **Manual vs expert** side by side · **Log this fix** (writes a real record into the fault log, shows repair time before → after) · **Simulate alarm** · **Print** · **QR**.

### Fault Log `/faults`
- **Does:** the factory's 65 fault records, each linked to the expert fix (or "No fix on file").
- **Test:** **Simulate alarm** (pick a fault in the dropdown). Covered fault → ghost speaks the fix. Uncovered (E-311 before capture) → "Nobody has explained this. Raju retires in 23 days."
- **Import fault log (CSV):** download **Sample CSV**, change a few rows, import it → numbers everywhere update.
- After **Log this fix** on a guide, the green row and the "Fixes confirmed" tile appear here.

### Manual✗ `/manual`
- **Does:** lists every place where Raju contradicts the official manual (e.g. manual: "replace the pump" → Raju: "it's air, bleed it, no new pump"), with his recording as proof.

### Drill `/drill`
- **Does:** quiz generated from the recordings; wrong answers are the real traps (what the manual says). Explains each answer with Raju's words and audio.

### Vault `/library`
- **Does:** every recording: search, play, see details, delete, export/import JSON.

### Graph `/graph`
- **Does:** the whole knowledge map. Dashed red rings = faults nobody has explained. Click a node to hear where it came from.

### Handover report `/report` (footer link)
- **Does:** one printable page for HR / maintenance head: captured, still at risk, ₹ impact, signatures. **Print / save as PDF** works.

### Header controls
- **Demo off/ON:** ON = no AI calls at all (use if Wi-Fi dies; demo still works).
- **Screen icon / P key:** presenter cue-card.
- **↺:** reset to starting data.

---

## If something goes wrong on stage

| Problem | Do this |
|---|---|
| Mic doesn't work | Use **Rehearsed demo story (E-311)** or **Type instead** |
| Wi-Fi dead / AI slow | Turn **Demo ON** in the header |
| Badge says "Offline brain" | Fine — Gemini free quota may be used up; everything still works |
| Numbers look wrong | **↺ Reset**, then start again |
| No sound | Laptop volume; voice needs a click first (Chrome blocks autoplay) |

---

## Likely judge questions

- **"What if the AI makes up a repair?"** — It only answers from recordings, cites them, plays the original audio, and refuses when nothing covers the question.
- **"Isn't this ChatGPT on documents?"** — There are no documents; that's the problem. We create them from speech, link them to the fault log, and measure what's still missing.
- **"How does it connect to fault records?"** — Every record is linked by fault code; you can import your real log as CSV; logging a fix writes back into the record.
- **"Indian factories?"** — Hindi, Kannada and code-mixed speech via Sarvam; answers in the junior's language.
- **"Scale?"** — Today it's one expert with full-context AI. For a whole plant: embeddings + graph database + CMMS integration; the alarm already shows the PLC/SCADA hook.
