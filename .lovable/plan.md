# What's still missing

Short list of real gaps, ordered by payoff per credit.

## 1. Search engines can't find you (highest payoff, cheapest)

There is no `robots.txt` and no `sitemap.xml` anywhere in the project. For a directory whose whole point is organic traffic, that's the biggest hole. Add both as routes so the sitemap is generated from the live page list (34 wiki pages + browse + ai + home).

## 2. Category landing pages

Right now every category lives behind `/browse?…` query params. Query-string pages rank poorly and can't be shared cleanly. Give each category its own real URL with its own title and description, listing that category's tools.

## 3. AI: map vague intents to real categories

Asking "how do I make money" still leans on plain keyword matching. Add a small intent map so broad goals resolve to concrete directory categories before ranking runs — the single biggest quality jump left in the AI, and it needs no model change.

## Deliberately shelved

Response caching, model upgrades, and the expanded roadmap schema (prerequisites / gotchas / optional steps) stay off until the above land.

## Technical notes

- `src/routes/robots[.]txt.ts` and `src/routes/sitemap[.]xml.ts` as server-route handlers returning plain text / XML; sitemap pulls slugs from `src/lib/fmhy-pages.ts` and the category list in `src/lib/tools-data.ts`.
- `src/routes/c.$category.tsx` for category pages, reusing the existing server-side paged search from `src/lib/tools-data.functions.ts`; per-route `head()` with unique title/description.
- Intent map as a constant in `src/lib/ai-tools.server.ts`, applied inside `rankTools` keyword expansion before candidate selection.
