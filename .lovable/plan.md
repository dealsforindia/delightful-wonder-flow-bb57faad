## Where things stand

Verified this turn: all 34 upstream pages exist locally, `backups` is intentionally removed, the de-branding pipeline in `src/lib/page-content.ts` strips source links/names, and every route already has its own `head()` metadata. The gap is content drift (~110 newer upstream lines) and a few product-level rough edges.

## Proposed improvements, highest value first

### 1. One-command content refresh (fixes the drift)
Add `scripts/refresh-content.ts`:
- Pulls all 34 upstream markdown files, maps `ai` to `artificial-intelligence`, skips `backups`.
- Writes into `src/content/*.md` untouched — the de-branding stays a render-time transform, so refreshing never re-leaks the source.
- Regenerates `src/lib/tools-data.server.ts` from the same fetch so page content and the 26k directory can't fall out of sync.
- Prints a per-page added/removed summary so you can see what changed.

Run it now to close the current gap.

### 2. De-branding safety net
Right now nothing catches a leak if upstream adds a new mirror domain. Add a small check that scans the rendered output for source-identifying strings and fails loudly, plus widen the domain pattern to cover any `fmhy.*` TLD rather than the current fixed list.

### 3. Dead link health
26k links, no idea how many still resolve. Add an offline checker that batches HEAD requests, records the last-good status per tool, and marks dead entries so `/browse` can hide or flag them. Runs as a script, not at request time.

### 4. Discovery polish on /browse
- Deep-linkable filters (category + query in the URL) so results are shareable.
- Result count and an empty state that suggests the AI search instead of a blank list.
- Copy-link and "open all in tabs" on a section.

### 5. Per-tool detail pages
Currently every result leaves the site immediately. Static routes like `/tool/$slug` with the tool's category, sibling alternatives, and the outbound link would keep visitors on-site and add ~26k indexable pages — the single biggest organic-traffic lever here.

## Scope note

Items 1 and 2 are maintenance and should go first. Items 3-5 are additive; pick any subset. Nothing here changes the theme, the AI routes, or the MCP server.
