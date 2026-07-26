# Upgrade AI features on `/ai`

Today the AI page has two modes: **Find** (returns a list of tools) and **Plan** (returns a static step list). Both are one-shot text calls that don't actually understand the 26k catalog deeply and don't help the user *act* on the answer. Here's how to make it feel genuinely intelligent.

## What to build

### 1. Streaming answers instead of "wait 6 seconds for a wall of text"
Switch `ai-search.functions.ts` and `ai-recipe.functions.ts` from `generateText` to `streamText` with `useChat` on the client. The user sees the answer type out live, and can cancel.

### 2. Roadmaps become interactive checklists, not static text
Today Plan returns prose. Change it so each step is a structured object:
```
{ step, goal, tool: {name, url, category}, why, estMinutes, prereq }
```
Render each step as a card with:
- ✅ Checkbox (progress saved to `localStorage`)
- 🔗 "Open tool" button (direct link, tracks completion)
- 🔄 "Swap tool" button → asks AI for an alternative from the same category
- ⏱️ Time estimate + total roadmap time at the top
- 📤 "Export" → copy as markdown / share link (roadmap encoded in URL)

### 3. Follow-up chat on any answer
After the first response, show a chat input: *"refine this — cheaper options / no signup only / Mac-friendly / add a step for X"*. Keeps conversation context so the user iterates instead of restarting.

### 4. Smarter tool selection (retrieval, not guessing)
Right now we send a fuzzy-prefiltered list to the model. Upgrade to:
- **Query rewriting**: model first expands "I want to make a podcast" → keywords `[recording, editing, hosting, transcription, cover art]`
- **Per-keyword retrieval**: fuzzy search the 26k catalog for each keyword separately, dedupe, then hand the model a much richer candidate pool
- Result: roadmaps that actually cover the full workflow instead of missing obvious steps

### 5. Compare mode
New third tab: **Compare**. User picks 2–4 tools from the catalog (or types names), AI returns a structured comparison table (features, pricing, signup required, platforms, best-for). Cached by tool-set hash so repeat comparisons are instant/free.

### 6. Save & share
- Every AI answer gets a shareable URL (`/ai/r/<id>`) — roadmap or search encoded in the path, no backend needed initially (base64 in URL) or Cloud-backed if we want a public gallery
- "My roadmaps" drawer in the sidebar, stored in `localStorage`

## Technical notes

- Model: keep `google/gemini-3.6-flash` for streaming + tool selection; use `google/gemini-3.1-pro-preview` only for Compare where quality matters
- Structured output for roadmaps and comparisons via the AI SDK `Output.object` API (keep schemas flat, no bounds — clamp in code)
- New files: `src/lib/ai-chat.functions.ts` (streaming chat route as `src/routes/api/ai.ts`), `src/lib/query-expand.ts`, `src/components/RoadmapCard.tsx`, `src/components/CompareTable.tsx`
- Refactor `src/routes/ai.tsx` into three tabs (Find / Plan / Compare) sharing one composer + streaming panel
- No new backend tables needed for v1; `localStorage` for saved roadmaps, URL encoding for share links

## Scope check

Big enough to feel like a real upgrade, small enough to ship in one pass. Want me to include all of 1–6, or trim? I'd suggest **1, 2, 3, 4** as the core (search feels alive + roadmaps become useful), and **5, 6** as a follow-up if you like the direction.