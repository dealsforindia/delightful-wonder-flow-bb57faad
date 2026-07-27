## Goal

On mirrored pages like `/downloading`, the big blue rows ("Video Sites", "Anime Sites", "Educational Sites"…) are currently links that redirect off-site (to FMHY / Reddit). You want them to become **plain text headings** with the actual list of sites shown **inline underneath**, exactly like the expanded Reddit wiki view in your screenshot.

At the same time, strip anything that outs the source as FMHY so nothing redirects back there.

## What I'll build

### 1. Scrape the Reddit wiki once, at build time

- Use Firecrawl (connector) to pull every page under `reddit.com/r/FREEMEDIAHECKYEAH/wiki/*` that matches our current slugs (`downloading`, `video`, `audio`, `gaming`, `educational`, `reading`, `torrenting`, `ai`, `android-iOS`, etc.).
- Save the cleaned markdown to `src/content/reddit/<slug>.md`.
- Reddit's wiki shows all sub-sections already expanded, which is exactly the layout in your second screenshot.

### 2. Replace category "links" with plain headings + inline list

In `src/lib/page-content.ts`, add a transform pass that runs on every mirrored markdown file:

- Detect the "collapsible category link" pattern (a bold/linked line like `[Video Sites](…)` that acts as a section header) and rewrite it to a plain markdown heading `### Video Sites` — no link, no redirect.
- Inline the sub-list that belongs to that heading from the Reddit-scraped file (matched by slug + heading text). If a Reddit version exists, use its list; otherwise keep the current list but strip the outer link.
- Result on `/downloading`: "Video Sites" appears as a non-clickable heading, followed immediately by the bulleted list of sites (Video Sites, Anime Sites, Educational Sites, Game Sites, Audio Sites, Torrent Clients…) — matching your reference screenshot.

### 3. Scrub FMHY fingerprints so nothing points home

Add a link-rewrite step in `src/components/MarkdownView.tsx` + the markdown cleaner:

- Drop or convert to plain text every link whose host is `fmhy.net`, `fmhy.pages.dev`, `fmhy.*` mirror, `rentry.co/FMHY*`, `rentry.org/FMHY*`, `reddit.com/r/FREEMEDIAHECKYEAH*`, or any `github.com/fmhy/*`.
- Remove the entire `backups.md` page (the "Official Website / Source", "Backup Instances", "Official Mirrors" content) — that's the biggest tell — and remove its sidebar entry in `src/lib/fmhy-pages.ts`.
- Rewrite any inline mentions of "FMHY", "FreeMediaHeckYeah", `r/FREEMEDIAHECKYEAH` in the markdown to nothing / "Unlocked".
- External tool links (real destinations like `youtube.com`, `libgen.rs`, etc.) stay intact — only source-identifying links get stripped.

### 4. Sidebar / meta cleanup

- Remove "Backups" from `src/lib/fmhy-pages.ts`.
- Update any remaining "community mirror of fmhy.net · content by the FMHY community" footer/subtitle text in `src/components/FmhyLayout.tsx` and `src/routes/__root.tsx` to a neutral Unlocked line.

## Technical notes

- Firecrawl scrape is a one-shot script committed as `scripts/scrape-reddit.ts`; output lands in `src/content/reddit/*.md` and is imported the same way as `src/content/*.md` via `import.meta.glob`.
- Matching Reddit sections to our headings uses normalized heading text (`lowercase`, strip punctuation) so "Video Sites" / "Video-Sites" both align.
- Nothing changes for the `/browse` 26k directory or the AI chat — this only affects the mirrored wiki pages.
- No new routes; no schema changes; no runtime scraping.

## Out of scope

- Rewriting individual tool destination URLs (they already go to the real sites).
- Building per-tool internal detail pages (can be a separate follow-up).
