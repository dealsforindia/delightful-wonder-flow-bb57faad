
## How the current AI works (quick explainer)

`/ai` has two one-shot modes:

- **Find tools** (`aiSearch` in `src/lib/ai-search.functions.ts`): takes your query → prefilters ~26k tools with fuzzy match → sends the top ~80 candidates + your query to Gemini → model returns a ranked list with a reason per tool.
- **Plan a workflow** (`aiRecipe` in `src/lib/ai-recipe.functions.ts`): takes your goal → asks Gemini to expand it into 3–7 workflow keywords → prefilters tools per keyword → sends candidates to Gemini → model returns a 3–7 step roadmap (tool + why + est. time).

Both are stateless single shots. That's the ceiling — no memory, no follow-up understanding, no ability to reference "that third tool" or "the section you just showed me". That's why it feels useless.

## What to build

Turn `/ai` from a one-shot form into a real **conversational assistant** with two upgrades:

### 1. Conversation with memory
- Replace the two-mode form with a chat interface (streaming, `useChat` + AI SDK).
- Every turn sends the full history to the model, so follow-ups like *"cheaper alternatives to #2"* or *"what about the second option?"* actually work.
- The assistant decides per turn whether to answer, search the directory, or build a roadmap — using **tools** (`searchTools`, `buildRoadmap`) instead of separate routes.
- Persistence: `localStorage` only, single conversation, "New chat" button clears it. (No thread list, no DB — keeps it simple.)

### 2. "Ask about this" — select-to-question
- Any assistant message (or any tool/roadmap card inside it) gets a **📌 Ask about this** button.
- Clicking it quotes that block into the composer as context (`> quoted text\n\n`) so the next question is grounded in exactly that snippet.
- Also: highlight text in a message → floating "Ask about selection" pill appears → same behavior.

### 3. Example the user gave, working end-to-end
User: *"I want to earn from affiliate marketing"*
→ Assistant replies with a short plan (pick niche → build site → traffic → monetize), calls `buildRoadmap` tool inline, roadmap renders as a card in the chat.
User selects step 3 → **Ask about this** → *"cheaper option?"*
→ Assistant calls `searchTools` scoped to that step's category, replies with 2–3 alternatives in-thread.

## Technical section

- **New route**: rewrite `src/routes/ai.tsx` as a chat UI (AI Elements-style messages, streaming, composer). Delete the current two-tab form.
- **New server route**: `src/routes/api/ai-chat.ts` — `POST` handler using AI SDK `streamText` + `toUIMessageStreamResponse`, model `google/gemini-3.6-flash`, `stopWhen: stepCountIs(50)`.
- **Tools registered on the server**:
  - `searchTools({ query, limit })` → reuses existing prefilter from `tools-data.server.ts`, returns compact `{name, url, category, description}[]`.
  - `buildRoadmap({ goal })` → reuses the keyword-expansion + step logic already in `ai-recipe.functions.ts`, returns a structured `Step[]`.
- **Client**: `useChat({ transport: DefaultChatTransport({ api: "/api/ai-chat" }) })`, render `message.parts` (text + tool-result parts, each tool result renders as a card).
- **Persistence**: single `unlocked.ai.chat` localStorage key holding `UIMessage[]`; restored on mount; "New chat" clears it.
- **Ask-about**: per-message button appends `> {message text}\n\n` to the composer input; text-selection listener on `.assistant-message` shows a floating pill that does the same for the selected substring.
- **Header search**: the ✨ Ask / 🗺️ Plan buttons in `FmhyLayout` forward `?q=` to `/ai` — change to seed the first chat message and auto-send.
- **Keep** existing `aiSearch` / `aiRecipe` / `aiSwapStep` server functions for now (MCP server references them); the new chat route wraps their internals.

## Non-goals for this change

- No DB, no auth, no thread list.
- No changes to `/browse` or the 26k directory.
- No model switch or provider change.
