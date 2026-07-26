The user picked **Unlocked** as the new name and wants two UI fixes: the hero title is getting clipped and the scrollbar is visible.

### What we will do

1. **Fix the headline clipping**
   - Add `break-words` / `overflow-wrap` to the homepage `h1` so a long single word never overflows its container.
   - Verify the new "Unlocked" headline renders fully on desktop and mobile.

2. **Hide the scrollbar**
   - Add a global `scrollbar-hide` rule in `src/styles.css` (WebKit + Firefox) so scrollbars are invisible while scrolling still works.
   - Apply it to the viewport and any internal scroll containers (sidebar, mobile drawer, search overlay).

3. **Rebrand to Unlocked**
   - Update visible brand copy in `src/components/FmhyLayout.tsx` (header logo, mobile drawer header).
   - Update the hero in `src/routes/index.tsx` (H1 and any brand mentions).
   - Update page meta titles in `src/routes/$page.tsx`, `src/routes/ai.tsx`, `src/routes/browse.tsx`, and `src/routes/__root.tsx` so they use "Unlocked" instead of "freemediaheckyeah / FMHY".
   - Keep the "Community mirror of fmhy.net" footer attribution unchanged, since Unlocked is the app name and the data still comes from FMHY.

4. **Verify**
   - Run the build and check the preview to confirm no clipping, no scrollbar, and the new brand name appears everywhere.
