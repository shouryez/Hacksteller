# GhostWrench (HackStellar PS-15)

Voice-first knowledge capture for retiring factory technicians. **The full spec is in `PLAN.md`; read it before building anything.**

## Stack
Next.js 15 (App Router) + TypeScript, Tailwind + shadcn/ui, Zustand (persisted to localStorage), idb-keyval for audio blobs, react-force-graph-2d, Fuse.js, qrcode.react. Claude API via `@anthropic-ai/sdk` (model `claude-opus-5-5`, structured outputs with Zod through `client.messages.parse` + `zodOutputFormat`). Web Speech API for speech-to-text, `speechSynthesis` for speech output.

## Rules
- `ANTHROPIC_API_KEY` lives only in `.env.local` / Vercel env vars. Never commit it; call Claude only from `app/api/*` routes.
- On `claude-opus-5-5`, don't send `thinking: {type: "disabled"}`, `budget_tokens`, or an assistant prefill: all return 400. Control speed with `output_config.effort`.
- Every API route must fall back to `public/demo/*.json` on error or when Demo Mode is on.
- No database and no vector store: the whole knowledge base is passed to Claude in full.
- Keep seed data in `data/`, seed audio in `public/audio/`.
- One feature per change; the app must stay runnable after every commit.
