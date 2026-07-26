# Plan: Upgrade the AI concierge to actually rank tools and feel responsive

## Problem
The AI concierge currently finds tools with simple substring matching, so it misses good results for natural-language queries. Assistant replies are plain text, there is no stop/regenerate control, and the header "Ask" / "Plan" buttons both send the same prompt.

## Goal
Rewire the concierge so the same LLM-ranked engine used by the standalone AI search also powers the chat, while improving the chat UI with markdown, stop/regenerate, and distinct Ask/Plan entry points.

## Implementation steps

### 1. Shared AI ranking & planning helper
Create `src/lib/ai-tools.server.ts` (server-only) that contains:
- `scoreTools(query, k)` — lightweight fuzzy prefilter.
- `expandKeywords(goal, apiKey)` — ask a small model for workflow keywords.
- `rankTools(query, limit, previousIds, apiKey)` — prefilter + LLM ranking of the best candidates.
- `buildRoadmap(goal, apiKey)` — keyword expansion + candidate pool + LLM planner.

Use the existing `createLovableAiGatewayProvider` helper with the correct `Lovable-API-Key` header (no `Authorization: Bearer`). Use:
- `google/gemini-3.1-flash-lite` for keyword expansion
- `google/gemini-3.6-flash` for ranking and planning

### 2. Thin server-function wrappers
Refactor:
- `src/lib/ai-search.functions.ts` → call `rankTools`.
- `src/lib/ai-recipe.functions.ts` → call `buildRoadmap`.

Switch validation to `.inputValidator` and ensure the gateway request uses `Lovable-API-Key`.

### 3. Upgrade the chat endpoint
In `src/routes/api/ai-chat.ts`:
- Replace the simple `scoreTools` in the `search_tools` tool with `rankTools`.
- Replace the inline `build_roadmap` planner with `buildRoadmap`.
- Upgrade the chat model to `google/gemini-3.6-flash`.
- Keep `stopWhen: stepCountIs(6)`.

### 4. Improve the chat UI
In `src/routes/ai.tsx`:
- Add `mode` search param (`search` | `roadmap`).
- When seeding from `?q`, use a mode-specific first message:
  - Ask: "Find the best free tools for: {q}"
  - Plan: "Build a step-by-step roadmap for: {q}"
- Render assistant text as markdown (bold, lists, links).
- Add a stop button while streaming and a regenerate button after the last assistant message.
- Surface 429 / 402 errors with clear, actionable messages.

### 5. Wire the header buttons
In `src/components/FmhyLayout.tsx`:
- "Ask" navigates to `/ai?mode=search&q=...`
- "Plan" navigates to `/ai?mode=roadmap&q=...`

### 6. Verify end-to-end
- Ensure `LOVABLE_API_KEY` is provisioned.
- Run typecheck and lint.
- Smoke-test the chat, browse, and MCP routes.
- Check AI gateway logs to confirm the correct model and headers are used.

## What will change for the user
- The AI finds better tools because it uses LLM ranking instead of just keyword matching.
- Assistant replies show formatted text and clickable links.
- Streaming can be stopped and a bad reply can be regenerated.
- The Ask and Plan buttons produce different first messages.

## Out of scope
- Accounts or database persistence
- New data sources beyond the existing FMHY index
- New non-AI browsing features