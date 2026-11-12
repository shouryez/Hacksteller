# GhostWrench — Every Page Explained

Each page below has: **what it's for**, **what's on screen**, **how to use it**, and **what to say**.
All data lives in your browser. **↺ Reset** (top right) puts everything back to the starting state.

---

## Header and footer (on every page)

| Item | What it does |
|---|---|
| **GhostWrench logo** | Back to the Risk Radar |
| **Menu** | Risk Radar · Capture · Interview · Ask · Guides · Fault Log · Manual✗ · Drill · Vault · Graph |
| **● Gemini / ● Offline brain** | Which AI is set up. Green Gemini = live AI. Offline brain = built-in fallback (still works) |
| **● Sarvam voice / Browser voice** | Indian-language speech recognition and voices (Sarvam), or Chrome's own |
| **Demo off / ON** | ON = no AI calls at all; rehearsed answers only. Use if Wi-Fi dies |
| **Screen icon (or P key)** | Presenter cue-card, bottom-left: the demo steps and what to say on the current page |
| **↺** | Reset to the starting data (4 stories, 52% coverage) |
| **Footer** | "Play the intro" (`/story`) and "Handover report" (`/report`) |

Small pop-ups in the bottom-right ("toasts") confirm actions, e.g. "Captured: …", "Fix logged".

---

## 1. Intro — `/story`

**For:** opening the pitch instead of a slide.

**On screen:** full black screen, one line at a time:
1. "Raju Gowda has kept these machines running for 34 years."
2. "He retires in 23 days."
3. "The fault log says: E-217 · Spindle overload alarm — 'reset ok'"
4. "It never says how he fixed it."
5. "48% of last year's downtime has no written fix." (live number)
6. GhostWrench logo + **Begin →**

**Use:** it plays by itself. Click, Space or → to go faster; ← to go back; **Skip →** jumps to the end. **Begin** opens the Risk Radar.

**Say:** nothing; let it play. Then: "This is Raju's problem, and every factory's."

---

## 2. Risk Radar — `/` (home)

**For:** showing the problem in numbers: how much repair knowledge is written down, what's missing, and what it's worth.

**On screen, top to bottom:**
- **Knowledge at risk card:** Raju's profile, red **"Retires in 23 days"**, how many stories are captured, how many juniors' questions are waiting. Buttons:
  - **Interview Raju about the biggest gap** → Interview page, opened on E-311
  - **Ask the Ghost** → Ask page
  - **Simulate a live alarm** → pops up a machine alarm (see the Alarm section)
- **Coverage ring (52%):** share of last year's downtime that has a recorded fix. "Downtime-weighted" means a fault that cost 30 hours counts more than one that cost 2.
  - **Fault codes covered 4/9**, **Downtime at risk 46 h**, **Only Raju knows 3 faults** (fixes that exist only in Raju's recordings)
- **Coverage by machine:** a bar per machine. Red under 50%, yellow 50–75%, green above. CNC Lathe L-04 is the worst (23%).
- **The records say vs Raju says:** a real log entry ("reset ok") next to Raju's actual tip. This is the whole problem in one picture.
- **Knowledge gaps, ranked by downtime:** E-311 first (servo over-temperature, 9 times, 33 h). Each has an **Interview** button.
- **Why it matters:** the ₹ impact.
  - Green: downtime the captured fixes can avoid per year (≈ 26 h, ≈ ₹6.5 lakh)
  - Red: downtime with no fix on record (≈ 46 h, ≈ ₹11.5 lakh at risk)
  - **Biggest wins:** e.g. "H-102 149 → 30 min" (usual downtime → Raju's fix time)
  - The **₹ per downtime hour** box (25,000) is an editable assumption; change it and the ₹ numbers update.
- Three cards linking to **Manual vs reality**, **Apprentice drill** and **Handover report**.

**Use:** this is your "before" picture. After you capture E-311, come back: the ring shows **86%** and E-311 is gone from the gaps.

**Say:** "Only half of last year's downtime has a written fix. E-311 alone cost 33 hours, and the log just says 'called Raju, fixed'."

---

## 3. Capture — `/capture`

**For:** recording an expert talking and turning it into structured repair knowledge. This is the heart of PS-15.

**On screen (left side):**
- **Expert** (Raju / Meena), **Machine** (L-04, HP-02, IM-07, CV-01), **Spoken language** (English / Hindi / Kannada; mixing is fine).
- **Big orange mic.** Press to record, it turns red, press again to stop. The bars move with your voice; a timer shows seconds.
- **Rehearsed demo story (E-311):** plays Raju's pre-recorded E-311 explanation with the transcript typing along. The safe option for the demo.
- **Type instead:** a text box to paste or type the explanation (no mic needed).
- **Live transcript:** the words appear as you speak.

**What happens when you stop:**
1. **Transcription:** Sarvam turns the audio into text (Hindi/Kannada also translated to English). Without Sarvam, Chrome's captions are used.
2. **Structuring:** the AI (Gemini) reads the rambling talk and pulls out symptoms, causes, fix steps, tools, safety warnings, "tribal tips" (rules of thumb not in any manual), and where Raju disagrees with the manual. It also links the story to a fault code from the log.
3. **Saved:** the audio stays in the browser as proof.

**Results that appear:**
- **Green banner: "Knowledge coverage 52% → 86%"** (plus a toast).
- **Completeness check:** 7 chips: Fault code, Symptoms, Root cause, Fix steps, Tools & spares, Safety, Tribal knowledge. Missing ones turn yellow with a ready follow-up question, e.g. "What can hurt someone doing this?". **Ask aloud** speaks it to Raju; **Record answer** records his reply and adds it to the same story.
- **Story card:**
  - title and summary · fault code (click → guide) · confidence · who structured it (Gemini or Offline brain)
  - **Symptoms / Causes / Fixes** columns
  - red **Safety** box
  - each fix with numbered steps and tools
  - **Tribal knowledge** quotes in Raju's own words
  - **Corrects the manual:** manual instruction crossed out next to Raju's way
  - **Original recording** play button
- **Transcript box:** fix any speech-recognition mistakes and click **Re-structure**.
- Buttons: **Open guide**, **Ask the Ghost**, **Record another**.

**Right side, the living knowledge graph:** every dot is a piece of knowledge (machine, fault, symptom, cause, fix, tool, expert). New dots pop in one by one with a glow, then the view re-centres. Dashed red rings are faults nobody has explained yet.

**Test without a mic:** Type instead → Machine L-04 → paste:
*"Tool changer not indexing, E-105. First check air pressure on the regulator, six bar, the screen shows wrong. Then wipe the proximity sensor with a dry cloth, never solvent. Lockout first. Twenty minutes."* → **Structure it**. You get fault E-105, steps, safety and tips, and coverage goes up.

**Say:** "Raju just talks, the way he'd teach an apprentice: Kannada, Hindi, mixed, rambling. Watch the knowledge appear."

---

## 4. Interview — `/interview`

**For:** the AI interviews Raju about exactly what is about to be lost, instead of waiting for him to remember.

**On screen:**
- **Left: question list.**
  - **Red "Gap"** cards: one per fault in the log with no fix (E-311, H-220, C-090, Q-410, E-105). The AI writes each question using the fault's history ("happened 9 times this year…"). "Writing questions…" shows while it works.
  - **Blue "Junior asked"** cards: questions a junior asked on the Ask page that the ghost couldn't answer. They land here automatically.
  - Each card shows the fault code, machine, the question, and why it matters (hours of downtime).
- **Right:**
  - **Ask aloud:** reads the question in a clear voice, so the AI is literally interviewing Raju.
  - The same recorder as Capture, already set to the right machine, with the question shown on top.

**What happens:** when the answer is saved, a gap question disappears (the fault now has a fix) and a junior question is marked answered. Coverage goes up everywhere.

**Use in the demo:** Radar → **Interview Raju about the biggest gap** (opens E-311) → **Ask aloud** → mic or **Rehearsed demo story**.

**Say:** "The AI doesn't wait for Raju to remember. It goes after the knowledge most at risk."

---

## 5. Ask the Ghost — `/ask`

**For:** a junior technician gets help in plain shop-floor language, by voice, with proof.

**On screen:**
- **Orange mic** (speak) or **text box** (type) + send.
- **4 example chips:**
  1. "Machine four is getting hot…"
  2. "The press ram is slow and there's a whining noise"
  3. "Parts on the moulding machine are not filling fully"
  4. "The tool changer on the lathe is not indexing properly"
- **Answer language:** English / हिंदी / ಕನ್ನಡ.

**The answer card:**
- The junior's question, then **Raju's ghost**, with badges: **AI voice reconstruction** (honest label), **confidence**, and who answered (**Gemini** or **Offline brain**; hover ⓘ to see why).
- The answer **types out and is spoken aloud in an Indian voice** (Play / Stop).
- Red **Safety first** box, always before the steps.
- **Numbered steps**, **Tools**.
- **Proof: where this came from:** the story it used, the expert, the date, a quote, and **Hear Raju say it** (his original recording), plus a **Guide** button.

**When nobody has explained it (e.g. the tool changer question):**
- Yellow box: **"Not covered yet, so I won't guess."**
- The question is automatically **added to Raju's interview list** (toast + link to Interview).

**Behind the scenes:** the AI only gets the recorded stories and the fault statistics, and is told to answer only from them, cite them, and refuse otherwise. Without AI, the offline brain finds the best matching story by keywords.

**Test:**
- Before capturing E-311: "Machine four is getting hot…" → honest refusal.
- After capturing E-311: same question → Raju's E-311 fix.
- Answer language ಕನ್ನಡ → answer in Kannada, spoken.

**Say:** "The junior asks the way he'd ask on the floor. The ghost answers with Raju's words and his voice as proof. And when it doesn't know, it says so and sends the question to Raju."

---

## 6. Guides — `/guides` and `/guides/E-311`

### Guides list
**On screen:**
- **Search** (finds by meaning-ish keywords: "coolant", "whine", "E-217", "conveyor drift").
- One card per fault code: green **Captured · N** (how many recordings) or red **Knowledge gap**, the description, machine, how often it happened, the downtime, and the guide title.

### One guide (e.g. E-311)
**Top bar:**
- **Simulate alarm:** make this machine raise this fault right now.
- **Print:** paper copy for the machine.
- "AI is merging stories…" shows when several recordings are combined into one procedure.

**Header card:**
- Machine, fault code and name, a short overview.
- Badges: times in 12 months, downtime, last seen, **~minutes to fix**, **Confirmed in the field ×N** (after fixes are logged), source.
- **QR code:** tap to make it big. **The whole guide is packed inside the QR**: a phone that scans it opens the steps without any app, login or database (`/g` page, with a tick-off list). Phone scanning needs the deployed version, not localhost.

**If no one has explained it:** red card with "No one has explained this fault yet", what the log says, **"All the manual offers"** (the weak official instructions), and **Interview Raju about E-xxx**.

**If it's covered (left column):**
- **Safety before you start** (red).
- **Procedure:** tap each step to tick it. A progress bar fills, and each step shows whose knowledge it came from.
- **Tools.**
- **Log this fix:** enter time taken and who fixed it, then **Save to fault log**. This writes a proper record ("Fixed with GhostWrench guide (Raju): Clean the cabinet fan filter…") into the fault log, so the log finally says *how*. A toast shows "usually 195 min → 25 min".
- **Manual vs expert:** the manual's instruction crossed out, next to what Raju actually does.

**Right column:**
- **What the manual won't tell you:** Raju's tips with his quotes.
- **Sources:** each recording with a play button.
- **What the fault log says:** the latest records. Guide-logged fixes show in green, with a **Repair time 195 → 25 min** banner.

**Say:** "This is the guide a junior uses at 2 am. And once he's done, the log finally records how it was fixed."

---

## 7. Fault Log — `/faults`

**For:** the factory's maintenance records (65 faults in 12 months), each linked to the expert knowledge behind it. This is the "connects with machine fault records" part of PS-15.

**On screen:**
- **Sample CSV** (download the format) and **Import fault log (CSV)** (load a real factory log).
- **4 tiles:**
  - **65** records (96 h downtime)
  - **69%** linked to an expert fix
  - **5** fault codes with no fix (46 h)
  - **Fixes confirmed in the field** (goes up when you use "Log this fix")
- **Alarm bar:** choose a fault → **Simulate alarm**.
- **Filters:** search box, machine buttons, **Only gaps**.
- **Table:**
  - Date, Machine, Fault (click → guide), Downtime
  - **The log says**: the useless notes ("reset ok") and who logged them; guide-logged fixes show a green tick
  - **What the expert knows**: the matching story title + expert, or red **No fix on file · interview**
- First 25 rows; **Show all 65 records** at the bottom.

**CSV import:** needs columns for date (YYYY-MM-DD), machine, fault code and downtime minutes; description, technician and note are optional. Headers like "Machine", "Code", "Downtime" are recognised. After import, coverage, gaps, interview questions, graph and report all recalculate. New machines are added automatically.

**Say:** "Every record now points to how it's actually fixed, or flags that nobody knows."

---

## 8. Machine alarm (pop-up)

**Opens from:** Radar (**Simulate a live alarm**), Fault Log (**Simulate alarm**), any guide (**Simulate alarm**).

**What happens:** a siren beeps, the screen dims, and a glowing red card shows the fault code, name, machine, how often it happens and the usual downtime.

- **If a fix is on file (green box):** "Raju's fix is on file · about 20 min", the safety warning, the first 3 steps, and **the ghost speaks it aloud** a second later (Mute / Replay). Buttons: **Open the guide**, **Dismiss**.
- **If no fix exists (red box):** "Nobody has explained how to fix this", what the log said last time, what the manual says, and "Raju knows. He retires in 23 days." Button: **Interview Raju now**.

The footnote explains that in a real plant this would come automatically from the machine's control system (PLC/SCADA).

**Close:** Dismiss, ✕, or Esc.

**Say:** "Night shift, the machine faults, Raju's at home. The answer is already on the screen, in his words."

---

## 9. Manual vs reality — `/manual` (menu: "Manual✗")

**For:** proving the knowledge exists nowhere on paper: every place Raju contradicts the official manual.

**On screen:**
- Headline: "**N places where the manual is wrong or incomplete**".
- One card per fault: each row has **The manual says** (crossed out) | **Raju does** (orange) | **Proof** (his recording).
- Examples:
  - Manual: "replace the pump" → Raju: "it's air, bleed it, no new pump"
  - Manual: "clean the filter every 3 months" → Raju: "every month, every two weeks in summer"
- Bottom: **"The manual is all we have for these faults"**: the gaps, with the manual's weak advice and an **Interview** button.

**Where it comes from:** official manual excerpts are stored in the app (`data/manual.json`); the AI compares each recording against them when structuring.

**Say:** "This is what's about to walk out the door: knowledge that contradicts the manual."

---

## 10. Apprentice Drill — `/drill`

**For:** training juniors, and a great moment to let a judge play.

**On screen:**
- **Start:** "Would you fix it the way Raju would?", number of questions, best score. **Start the drill**.
- **8 questions**, each tagged:
  - **First move:** "IM-07 raises Q-330. What do you do first?"
  - **Manual trap:** "The manual says X. What does Raju do instead?"
  - **Diagnosis:** "You notice this symptom. Most likely cause?"
  - **Safety:** "Before this fix, which precaution is a must?"
- Four options (A–D). The wrong ones are real traps: what the manual says, or fixes for other faults.
- After answering: green/red, "Exactly what Raju would do" or "Not quite", the explanation, Raju's quote, **Hear the recording**, **Next question**.
- **End:** score circle, a message, **Review these guides** (the faults you missed), **New drill**.

**Where it comes from:** questions are generated from the recordings, so every new story adds new questions.

**Say:** "Hand the judge the mouse: would *you* fix it like Raju?"

---

## 11. Vault — `/library`

**For:** managing every recording.

**On screen:**
- Totals: stories, fixes, tribal tips, fault codes.
- **Import** / **Export JSON** (back up or move the knowledge; audio stays on this computer).
- Search, machine filter, expert filter.
- Each row: title, expert, machine, date/time, language, badges (**seed** = starting data, **interview** = answered an interview question, fault codes), **Play**, **delete** (bin icon).
- Click a row to expand: full transcript + the full story card.

---

## 12. Graph — `/graph`

**For:** seeing how all the repair knowledge connects.

**On screen:**
- Machine filter buttons (All, L-04, HP-02, IM-07, CV-01).
- **The map**, colour-coded:
  - grey = machine · orange = fault code · yellow = symptom · purple = cause
  - green = fix · blue = tool · pink = expert
  - **dashed red ring = fault nobody has explained**
- Drag to move, scroll to zoom.
- **Click a node:** the side panel shows what it is and which recordings it came from, with play buttons.

**Say:** "Repairs are chains: symptom → cause → fix. Two technicians' stories reinforce each other here, and the gaps are visible."

---

## 13. Handover report — `/report` (footer link)

**For:** the document HR and the maintenance head actually want before Raju leaves.

**On screen (white, printable page):**
- **Header:** Raju's name, role, years; date generated; last working day; **days remaining** in red.
- **4 numbers:** coverage %, fault codes covered, recordings, manual corrections + tribal tips.
- **1. Knowledge captured:** table of covered faults: what the expert does, source, fix time.
- **2. Still at risk:** uncovered faults with occurrences and downtime; waiting junior questions; a "single point of failure" warning (fixes only Raju has explained).
- **3. Business impact:** avoidable downtime and ₹, at-risk downtime and ₹, fixes confirmed in the field.
- **Signature lines:** Raju, Maintenance head, HR / plant manager.
- **Print / save as PDF.**

Everything updates live as you record.

**Say:** "Every factory has a Raju. His last day shouldn't be the day his knowledge dies." (close the demo here)

---

## 14. Phone guide — `/g` (opened by scanning a QR)

**For:** the technician at the machine. Scan the sticker and the guide opens on the phone.
**On screen:** safety first, big tick-off steps with a progress bar, tools, tips. No app, no login; the guide is inside the QR itself.
