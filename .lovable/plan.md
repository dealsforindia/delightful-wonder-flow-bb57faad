# Plan: Make the FMHY mirror fast and mobile-first

## Goal
Turn the current FMHY mirror from a desktop-biased, substring-search, 26k-row list into a fast, mobile-first search tool that feels like a real product on both phone and desktop. Focus on **search speed** and **responsive UX**.

## Verified current state
- `src/lib/tools-data.ts` is a 26k-line synchronous JS import loaded on every route, bloating the initial bundle.
- `src/routes/browse.tsx` uses substring `includes()` search and renders up to 300+ DOM rows at once with a "Load more" button.
- `src/components/FmhyLayout.tsx` crams desktop search, nav, and AI buttons into a single sticky header; mobile menu is a bare hamburger toggle.
- Search state is local `useState` (`q`, `cat`, `visible`) so queries are not shareable via URL.
- AI route (`src/routes/ai.tsx`) already exists but uses the full 26k dataset in server functions.

## What we will build

### 1. Async, chunked data loading
- Move `TOOLS` out of the critical render path. Use a dynamic `import()` + `createServerFn` so the 26k list is fetched as a separate JSON chunk only when the user visits `/browse` or `/ai`.
- Keep the homepage and markdown pages fast; they no longer pay the 26k-tool parse cost.

### 2. Real fuzzy search engine
- Add `fuse.js`.
- Build a search index in a `useMemo` once data arrives, keyed by `name`, `section`, `category`, and `url`.
- Replace substring `includes()` with Fuse scoring, fuzzy matching, and relevance ranking.

### 3. URL-backed search state
- Add `validateSearch` to `/browse` for `q`, `cat`, `sort`.
- Replace `useState` with `Route.useSearch()` + `useNavigate()` so every search is shareable, back-buttonable, and deep-linkable.
- Sync the header search bar with the `/browse` route search params.

### 4. Virtualized results list
- Install `@tanstack/react-virtual`.
- Render the browse results in a virtualized list so 26k rows do not all hit the DOM at once.
- Keep category filters as a horizontally scrollable chip row on mobile.

### 5. Mobile-first responsive redesign
- **Header**: collapsible search on mobile. Tapping the search icon opens a full-width search overlay with the input, category chips, and AI buttons. Desktop keeps the inline search bar.
- **Navigation**: replace the bare hamburger toggle with a `vaul` bottom sheet/drawer on mobile, containing the full sidebar nav with proper scroll.
- **Tool cards**: redesign rows for touch: larger hit targets, clear tap affordance, icon + name + category stacked vertically on small screens.
- **Sidebar**: improve sticky scroll and active-state visibility on desktop.

### 6. Performance guardrails
- Use `useDeferredValue` for the search input so typing stays smooth while the heavy list filters.
- Add `React.memo` to tool row items.
- Debounce the server-function AI prefilter calls.

### 7. Verification
- Run `bun run build` to confirm no bundle errors.
- Test `/browse` search on desktop (real-time fuzzy, URL updates, virtual scroll).
- Test mobile via preview: header search overlay, nav drawer, tap targets, no layout breakage.

## Files we will change
- `src/routes/browse.tsx` — rewrite with URL search, Fuse, virtualization.
- `src/components/FmhyLayout.tsx` — mobile header overlay, nav drawer, responsive polish.
- `src/lib/tools-data.ts` — optionally split into a lazily loaded module or expose via a server function.
- `src/lib/ai-search.functions.ts` / `src/lib/ai-recipe.functions.ts` — keep but optimize prefiltering.
- `src/routes/__root.tsx` — minor meta updates if needed.
- `package.json` — add `fuse.js` and `@tanstack/react-virtual`.

## Out of scope for this pass
- Backend/persistent search analytics.
- User accounts or saved searches.
- Major homepage redesign beyond the header/sidebar changes.

## Dependencies to add
- `fuse.js`
- `@tanstack/react-virtual`
