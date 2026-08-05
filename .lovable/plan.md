# Making the AI actually smarter

The AI already works, but it is guessing more than it should. Four concrete weaknesses exist in the current code, and each has a fix that measurably improves answer quality.

## What is wrong today

**1. The AI never sees what a tool does.**
Every candidate handed to the model is just `name | section | category`. Nothing describes the tool. So when ranking "I want to edit a podcast", the model is pattern-matching on names alone. The wiki pages already contain a one-line description next to almost every link — that text is being thrown away during the directory build.

**2. Search fails on intent, not keywords.**
The candidate prefilter is a literal substring match. A query like "make money online" or "remove background from a photo" matches zero tool names, so the model receives an empty or near-empty candidate list and the answer degrades to a generic fuzzy fallback. Keyword expansion already exists in the codebase but is only wired into roadmaps, not search.

**3. Old model, and no reasoning where it helps.**
Everything runs on `gemini-2.5-flash` (previous generation). Ranking and planning are exactly the tasks where a newer model changes the output quality.

**4. Every question costs a full round trip.**
Identical or near-identical queries re-run keyword expansion plus ranking each time. Repeat questions feel slow for no reason.

## The plan

### Phase 1 — Give the AI real knowledge (biggest win)
- Extend the content refresh script to capture the description text that follows each link in the wiki markdown, plus badge markers (open source, self-hostable, etc.).
- Add `description` and `tags` to each directory row.
- Feed that description into ranking, roadmap and comparison candidate lists, and show it in the tool cards in the UI too.

### Phase 2 — Intent-aware retrieval
- Run keyword expansion before search ranking, not just roadmaps, and union the results so paraphrases find the right tools.
- Add synonym and category-intent mapping ("passive income" -> Misc/Money sections, "edit podcast" -> Audio) so intent queries always land on a real slice of the directory.
- When the prefilter still comes back thin, widen to the whole category instead of returning "Top fuzzy match".

### Phase 3 — Better models and lower latency
- Move ranking, planning and chat to the current-generation Gemini Flash model; use the cheap lite model for keyword expansion only.
- Cache ranking and roadmap results by normalised query for the session so repeats are instant.
- Cap candidate lists smartly (dedupe near-identical entries) so more of the budget goes to good candidates rather than noise.

### Phase 4 — Answer quality guardrails
- Reject roadmap steps whose chosen tool's category is unrelated to the step action, and retry once rather than shipping a forced match.
- Show the AI's confidence: when the directory genuinely has no good fit, say so instead of recommending the least-bad option.

## Technical notes

- `scripts/refresh-content.ts`: extend `parseTools` to capture trailing description text and badges; widen the `Entry` type and the generated `tools-data.server.ts` shape.
- `src/lib/tools-data.ts`: add optional `description` and `tags` to the `Tool` type so existing rows stay valid during rollout.
- `src/lib/ai-tools.server.ts`: call `expandKeywords` inside `rankTools`; add a synonym map; include descriptions in the candidate index lines; add an in-memory LRU cache keyed by normalised query.
- `src/routes/api/ai-chat.ts`: bump the model id, pass descriptions through the tool results so the chat reply can cite them.
- De-branding still applies: descriptions run through the same cleaner, and `scripts/check-debranding.ts` must pass after the refresh.

## Suggested order

Phase 1 alone changes answer quality the most, because it is the only fix that adds information the model currently does not have. Phases 2 and 3 can ship together right after.
