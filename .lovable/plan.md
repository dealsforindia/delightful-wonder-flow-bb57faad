# Step one: give the AI real facts about each tool

Scoped down to fit the credits you have left. This is the single change that makes every AI answer more practical, and everything else in the bigger plan depends on it.

## Why this one

Today the AI sees only `name | section | category` for each candidate. It cannot tell you what a tool actually does, whether it needs a signup, or whether it's paid — so it writes generic advice around bare names. The wiki text already contains a short description next to nearly every link, plus markers for open source, self-hostable, and paid tiers. That data is thrown away during the directory build.

Capture it, and the same AI calls suddenly have something concrete to reason with.

## What changes

1. The directory build keeps each tool's short description and its badge markers (open source / self-hostable / paid) instead of discarding them.
2. Those descriptions are included in the candidate list sent to the AI for search, roadmaps, and swaps — so recommendations can name what the tool does and flag a signup or paid tier.
3. Tool cards in the browse UI show the description line, which also makes the directory more useful on its own.

## Not in this step

Intent-to-category mapping, caching, model upgrades, and the expanded roadmap schema (prereqs / gotchas / optional steps) stay on the shelf until you have more credits.

## Technical notes

- `scripts/refresh-content.ts`: extend `parseTools` to capture trailing description text and badge markers; widen the generated `tools-data.server.ts` rows.
- `src/lib/tools-data.ts`: add optional `description` and `tags` to `Tool` so existing rows stay valid.
- `src/lib/ai-tools.server.ts`: include the description in the candidate index lines for `rankTools`, `buildRoadmap`, and `swapStep`.
- `src/routes/browse.tsx`: render the description on tool cards.
- Descriptions run through the existing de-branding cleaner; `scripts/check-debranding.ts` must pass after the refresh.
