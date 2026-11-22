<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Validate AI-picked tool IDs against the actual candidate shortlist and deduplicate them through `ai-selection`; valid directory IDs alone do not prove relevance.
- Restore chat storage only after hydration and render unfinished historical tool calls as stopped; reloads must not restart old work or show permanent loading.
