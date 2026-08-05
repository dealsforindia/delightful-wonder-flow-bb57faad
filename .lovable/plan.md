# Making the AI give practical, usable answers

Right now the AI recommends tools. What it does not do is tell you how to actually get the thing done — the steps, the catch, the realistic cost of your time. That is the gap to close.

## The real problem

**It recommends blind.** Every candidate the model sees is just `name | section | category`. It has no idea what a tool does, whether it needs a signup, whether it runs on Windows, or whether it is abandoned. So the advice it writes around those names is generic by necessity.

**It answers the keyword, not the intent.** "I want to make money editing videos" matches no tool name literally, so the search returns a weak fuzzy fallback and the AI writes filler on top of it.

**Roadmaps are tool lists in disguise.** Steps get a tool and a one-line action, but no "you'll hit this wall here", no prerequisite check, no honest time estimate. That is what makes a plan usable versus decorative.

**It never says "no".** When the directory genuinely has nothing good, it still recommends the least-bad option, which is worse than admitting the gap.

## The plan

### 1. Give the AI facts to reason with
The wiki text already carries a description next to nearly every link, plus markers for open source, self-hostable, and paid tiers. That data is discarded during the directory build. Capture it, attach it to each tool, and feed it into every ranking, roadmap, and comparison call — and show it on the tool cards in the UI while we're at it.

### 2. Make answers actionable by default
Rework the assistant's instructions so every recommendation must carry:
- what you do first, concretely
- the one thing that usually goes wrong with this tool
- signup / account / install requirement, stated plainly
- when to pick something else instead

No recommendation ships without those four. If the AI cannot supply them, it should say the tool is untested rather than invent detail.

### 3. Roadmaps that survive contact with reality
- A prerequisites line up front: what you need before step 1 (account, hardware, a file, money).
- Per step: the actual action, what "done" looks like, and the common failure point.
- An honest total time, and a "skip this step if…" note where a step is optional.
- Reject a step whose tool doesn't match what the step is asking for, and retry once instead of forcing a bad fit.

### 4. Intent-aware retrieval
Expand the query into workflow keywords before searching (this already exists for roadmaps, just not search), map common intents to real categories, and when the candidate pool is still thin, widen to the whole category instead of returning "top fuzzy match".

### 5. Honest gaps and repeat speed
- When nothing in the directory fits, say so and suggest the closest adjacent approach.
- Cache ranking and roadmap results per query so asking the same thing twice is instant.

## Technical notes

- `scripts/refresh-content.ts`: extend `parseTools` to capture trailing description text and badge markers; widen the generated `tools-data.server.ts` rows.
- `src/lib/tools-data.ts`: add optional `description` and `tags` to `Tool` so existing rows stay valid during rollout.
- `src/lib/ai-tools.server.ts`: call `expandKeywords` inside `rankTools`; add an intent-to-category map; include descriptions in candidate index lines; add a category-widening fallback; add an in-memory cache keyed by normalised query. Extend the roadmap schema with `prereqs`, `gotcha`, and `optional`.
- `src/routes/api/ai-chat.ts`: rewrite the system prompt around the four required facts per recommendation and the "say no" rule; pass descriptions through tool results.
- `src/routes/ai.tsx`: render prerequisites and per-step gotchas in the roadmap cards.
- De-branding still applies: descriptions run through the same cleaner, and `scripts/check-debranding.ts` must pass after the refresh.

## Order

Step 1 first — it is the only change that adds information the model currently does not have, and steps 2 and 3 depend on it to say anything specific. Then 2 and 3 together, then 4 and 5.
