# GhostWrench (HackStellar PS-15)

Voice-first knowledge capture for retiring factory technicians. **The full spec is in `PLAN.md`; read it before building anything.**

## Stack
Next.js 15 (App Router) + TypeScript, Tailwind + shadcn/ui, Zustand (persisted to localStorage), idb-keyval for audio blobs, react-force-graph-2d, Fuse.js, qrcode.react. Claude API via `@anthropic-ai/sdk` (model `claude-opus-5-5`, structured outputs with Zod through `client.messages.parse` + `zodOutputFormat`). Web Speech API for speech-to-text, `speechSynthesis` for speech output.

## Rules
- `ANTHROPIC_API_KEY` lives only in `.env.local` / Vercel env vars. Never commit it; call Claude only from `app/api/*` routes.
- On `claude-opus-5-5`, don't send `thinking: {type: "disabled"}`, `budget_tokens`, or an assistant prefill: all return 400. Control speed with `output_config.effort`.
- Every AI route must go through `withFallback` (`lib/route-helpers.ts`): it falls back to the offline brain (`lib/offline.ts`) on error, without a key, or in Demo Mode. Keep the offline brain working; the live demo depends on it.
- No database and no vector store: the whole knowledge base is passed to Claude in full.
- Keep seed data in `data/` (rehearsed demo story in `data/demo/`), seed audio in `public/audio/`.
- `SARVAM_API_KEY` enables Sarvam STT (Saaras v3, clips under 30 s, so audio is chunked client-side) and TTS (Bulbul v3); without it the browser speech APIs are used.
- Verify with `npm run lint && npm run build` before committing.
- One feature per change; the app must stay runnable after every commit.
