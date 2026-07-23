import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Command, CornerDownLeft, Search, Sparkles, Star, StarOff, Wand2, ChevronRight, Orbit } from "lucide-react";
import { TOOLS, CATEGORIES, type Category, type Tool } from "@/lib/tools-data";
import { aiSearch } from "@/lib/ai-search.functions";
import { aiRecipe } from "@/lib/ai-recipe.functions";
import { Constellation } from "@/components/Constellation";

export const Route = createFileRoute("/")({
  component: Palette,
});


type Filter = "all" | "favorites" | Category;
const FAV_KEY = "fmhy.favs.v1";


/* ---------- fuzzy scoring ---------- */
function score(hay: string, needle: string): number {
  if (!needle) return 1;
  hay = hay.toLowerCase();
  needle = needle.toLowerCase();
  if (hay === needle) return 1000;
  if (hay.startsWith(needle)) return 800;
  const idx = hay.indexOf(needle);
  if (idx >= 0) return 500 - idx;
  // subsequence match
  let hi = 0, ni = 0, gaps = 0, last = -1;
  while (hi < hay.length && ni < needle.length) {
    if (hay[hi] === needle[ni]) {
      if (last >= 0) gaps += hi - last - 1;
      last = hi;
      ni++;
    }
    hi++;
  }
  if (ni < needle.length) return -1;
  return 200 - gaps;
}

function toolScore(t: Tool, q: string): number {
  if (!q) return 0;
  return Math.max(
    score(t.name, q) * 2,
    score(t.section, q),
    score(t.category, q),
    score(t.url, q) * 0.8,
  );
}

/* ---------- component ---------- */
function Palette() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Filter>("all");
  const [cursor, setCursor] = useState(0);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<Array<{ tool: Tool; why: string }>>([]);
  const [showConstellation, setShowConstellation] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<{ title: string; steps: Array<{ tool: Tool; action: string; output: string }> } | null>(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const runAiSearch = useServerFn(aiSearch);
  const runAiRecipe = useServerFn(aiRecipe);


  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavs(new Set(JSON.parse(raw)));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favs)));
    } catch {}
  }, [favs, ready]);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const fuzzyResults = useMemo(() => {
    const q = query.trim();
    let base = TOOLS as Tool[];
    if (cat === "favorites") base = base.filter((t) => favs.has(t.url));
    else if (cat !== "all") base = base.filter((t) => t.category === cat);

    if (!q) return base.slice(0, 300);
    const scored: Array<{ t: Tool; s: number }> = [];
    for (const t of base) {
      const s = toolScore(t, q);
      if (s > 0) scored.push({ t, s });
    }
    scored.sort((a, b) => b.s - a.s);
    return scored.slice(0, 200).map((x) => x.t);
  }, [query, cat, favs]);

  const results = aiMode
    ? aiResults.map((r) => r.tool)
    : fuzzyResults;

  useEffect(() => setCursor(0), [query, cat, aiMode, aiResults]);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const toggleFav = (url: string) =>
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });

  const open = (t: Tool) => window.open(t.url, "_blank", "noopener,noreferrer");

  const runAi = async () => {
    const q = query.trim();
    if (q.length < 2) return;
    setAiMode(true);
    setAiLoading(true);
    setAiError(null);
    setAiResults([]);
    try {
      const out = await runAiSearch({ data: { query: q } });
      setAiResults(out);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "AI search failed");
    } finally {
      setAiLoading(false);
    }
  };

  const exitAi = () => {
    setAiMode(false);
    setAiResults([]);
    setAiError(null);
  };

  const runRecipe = async () => {
    const q = query.trim();
    if (q.length < 3) return;
    setRecipeLoading(true);
    setRecipe(null);
    setAiError(null);
    try {
      const out = await runAiRecipe({ data: { goal: q } });
      setRecipe(out);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Recipe failed");
    } finally {
      setRecipeLoading(false);
    }
  };

  const closeRecipe = () => setRecipe(null);


  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if ((e.metaKey || e.ctrlKey || e.shiftKey) && !aiMode) { void runAi(); return; }
      const t = results[cursor]; if (t) open(t);
    }
    else if (e.key === "Escape" && aiMode) { e.preventDefault(); exitAi(); }
    else if (e.key === "Tab") {
      e.preventDefault();
      if (aiMode) exitAi();
      const filters: Filter[] = ["all", "favorites", ...CATEGORIES];
      const i = filters.indexOf(cat);
      setCat(filters[(i + (e.shiftKey ? -1 : 1) + filters.length) % filters.length]);
    }
  };


  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* prismatic backdrop glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 -z-10 h-[36rem] w-[36rem] rounded-full opacity-40 blur-[140px]"
        style={{ background: "var(--color-primary)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-40 -right-40 -z-10 h-[32rem] w-[32rem] rounded-full opacity-30 blur-[140px]"
        style={{ background: "var(--color-secondary)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* status bar */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-border/60 bg-background/70 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground backdrop-blur-md sm:px-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 text-primary">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]" />
            system active
          </span>
          <span className="hidden h-[1px] w-8 bg-border sm:block" />
          <span className="hidden sm:inline">FMHY mirror · v.4.2</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConstellation(true)}
            className="text-primary transition-colors hover:text-foreground"
          >
            [ constellation ]
          </button>
          <span className="hidden sm:inline">{TOOLS.length.toLocaleString()} index points</span>
        </div>
      </div>

      {showConstellation && <Constellation onClose={() => setShowConstellation(false)} />}

      {/* hero + palette container */}
      <section className="relative mx-auto max-w-4xl px-5 pt-24 pb-24 sm:px-8 sm:pt-32">
        {/* header */}
        <header className="mb-12 space-y-5">
          <div className="flex items-center gap-4">
            <span className="bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.25em] text-primary-foreground">
              System Active
            </span>
            <div className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-tighter text-muted-foreground">
              {TOOLS.length.toLocaleString()} Index Points
            </span>
          </div>
          <h1
            className="font-display text-6xl font-extrabold uppercase italic leading-[0.85] tracking-tighter sm:text-8xl lg:text-[9rem]"
          >
            Free the
            <br />
            <span
              className="text-transparent"
              style={{ WebkitTextStroke: "1.5px oklch(0.98 0 0 / 0.32)" }}
            >
              Internet
            </span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            An index of {TOOLS.length.toLocaleString()} verified tools — privacy software, media,
            learning, AI. Search directly, ask AI to pick, or describe a goal and get a
            step-by-step recipe.
          </p>
        </header>

        {/* try chips */}
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <span className="text-primary">// try</span>
          {[
            "launch an anonymous blog for free",
            "make a logo for a coffee shop",
            "learn japanese in 30 days",
            "download a youtube playlist as mp3",
          ].map((s) => (
            <button
              key={s}
              onClick={() => { setQuery(s); setTimeout(() => void runRecipe(), 0); }}
              className="lowercase tracking-normal underline-offset-4 transition-colors hover:text-primary hover:underline"
            >
              {s}
            </button>
          ))}
        </div>

        {/* search cluster */}
        <div className="group relative mb-6">
          <div
            className="absolute -inset-[1px] rounded-none opacity-40 blur-md transition duration-700 group-focus-within:opacity-100"
            style={{ background: "linear-gradient(90deg, var(--color-primary), var(--color-secondary))" }}
          />
          <div className="relative flex bg-black border border-white/10">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); if (aiMode) exitAi(); }}
              onKeyDown={onKeyDown}
              placeholder={aiMode ? "AI is thinking…" : "Search the FMHY mirror…"}
              className="w-full bg-transparent py-5 pl-11 pr-2 text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              spellCheck={false}
              autoComplete="off"
            />
            <div className="flex items-center gap-2 p-2">
              <button
                type="button"
                onClick={() => void runRecipe()}
                disabled={recipeLoading || query.trim().length < 3}
                className="flex items-center gap-1.5 border border-white/10 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-foreground transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
                title="Build recipe"
              >
                <Wand2 className={`h-3 w-3 ${recipeLoading ? "animate-spin" : ""}`} />
                {recipeLoading ? "…" : "Recipe"}
              </button>
              <button
                type="button"
                onClick={() => (aiMode ? exitAi() : void runAi())}
                disabled={aiLoading || query.trim().length < 2}
                className={`flex items-center gap-1.5 px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${
                  aiMode
                    ? "bg-primary text-primary-foreground"
                    : "bg-white text-black hover:bg-primary hover:text-primary-foreground"
                }`}
                title="Ask AI"
              >
                <Sparkles className={`h-3 w-3 ${aiLoading ? "animate-pulse" : ""}`} />
                {aiLoading ? "…" : aiMode ? "Exit" : "Ask AI"}
              </button>
            </div>
          </div>
        </div>

        {/* category chips */}
        {!aiMode && (
          <div className="mb-8 flex flex-wrap gap-2">
            <Chip active={cat === "all"} onClick={() => setCat("all")}>All</Chip>
            <Chip active={cat === "favorites"} onClick={() => setCat("favorites")}>
              ★ {favs.size > 0 && <span className="ml-1 opacity-70">{favs.size}</span>}
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>
            ))}
          </div>
        )}

        {aiMode && (
          <div className="mb-4 flex items-center gap-2 border border-primary/40 bg-primary/5 px-4 py-2 text-[11px] text-primary">
            <Sparkles className="h-3 w-3" />
            <span className="truncate">
              {aiLoading ? "Scanning 14,800+ tools for the best match…" : aiError ? aiError : `AI picked ${aiResults.length} tools for “${query.trim()}”`}
            </span>
          </div>
        )}

        {/* tool slabs */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            {aiMode ? "AI Picks" : cat === "favorites" ? "Favorites" : cat === "all" ? "Directory" : cat}
          </h2>
          <div className="mx-4 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
          <span className="font-mono text-[10px] text-muted-foreground">
            {results.length.toLocaleString()} shown
          </span>
        </div>

        <div ref={listRef} className="max-h-[68vh] overflow-y-auto">
          {results.length === 0 && !aiLoading && (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {aiMode ? (aiError ? "AI search failed. Try again." : "No matches.") :
                cat === "favorites" ? "No favorites yet. Star anything to pin it here." : "No matches."}
            </div>
          )}
          {aiLoading && (
            <div className="space-y-1">
              {[0,1,2,3].map((i) => (
                <div key={i} className="h-16 animate-pulse border-b border-white/5 bg-muted/20" style={{ animationDelay: `${i * 100}ms` }} />
              ))}
            </div>
          )}
          {!aiLoading && results.map((t, i) => (
            <Row
              key={t.url}
              tool={t}
              active={i === cursor}
              fav={favs.has(t.url)}
              idx={i}
              reason={aiMode ? aiResults[i]?.why : undefined}
              onEnter={() => setCursor(i)}
              onOpen={() => open(t)}
              onFav={() => toggleFav(t.url)}
            />
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-border/40 pt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
          <span>// end of stack</span>
          <span className="flex items-center gap-2">
            {aiMode ? <>ai picks · esc to exit</> : <>open <Kbd><CornerDownLeft className="h-2.5 w-2.5" /></Kbd> · <Kbd>⇧↵</Kbd> ask ai</>}
          </span>
        </div>
      </section>



      {(recipe || recipeLoading) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-md sm:p-10" onClick={closeRecipe}>
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-2xl shadow-primary/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border/50 bg-gradient-to-r from-accent/10 via-primary/10 to-secondary/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-accent" />
                <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">recipe</span>
              </div>
              <button onClick={closeRecipe} className="text-xs text-muted-foreground hover:text-foreground">close ✕</button>
            </div>

            {recipeLoading && (
              <div className="space-y-3 p-6">
                <div className="h-6 w-2/3 animate-pulse rounded bg-muted/40" />
                {[0,1,2,3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-lg bg-muted/30" style={{ animationDelay: `${i*120}ms` }} />
                ))}
                <p className="pt-2 text-center text-[11px] text-muted-foreground">Composing a plan across 14,800+ tools…</p>
              </div>
            )}

            {recipe && !recipeLoading && (
              <div className="p-6">
                <h2 className="mb-1 text-2xl font-light leading-tight tracking-tight">{recipe.title}</h2>
                <p className="mb-6 text-xs text-muted-foreground">{recipe.steps.length} steps · every tool is free</p>
                <ol className="space-y-3">
                  {recipe.steps.map((s, i) => (
                    <li key={i} className="group relative flex gap-4 rounded-xl border border-border/50 bg-background/60 p-4 transition-all hover:border-primary/50">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-secondary text-[13px] font-semibold text-primary-foreground shadow-lg shadow-primary/30">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] leading-snug text-foreground">{s.action}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                          <a
                            href={s.tool.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-full border border-primary/50 bg-primary/10 px-2.5 py-1 font-medium text-primary transition-all hover:bg-primary/20"
                          >
                            {s.tool.name} <ArrowUpRight className="h-3 w-3" />
                          </a>
                          <span className="text-muted-foreground">→ {s.output}</span>
                        </div>
                      </div>
                      {i < recipe.steps.length - 1 && (
                        <ChevronRight className="pointer-events-none absolute -bottom-3 left-7 h-4 w-4 rotate-90 text-border" />
                      )}
                    </li>
                  ))}
                </ol>
                <div className="mt-6 flex items-center justify-between border-t border-border/40 pt-4 text-[11px] text-muted-foreground">
                  <span>generated for: <span className="text-foreground/80">{query}</span></span>
                  <button onClick={() => void runRecipe()} className="rounded-full border border-border/60 px-3 py-1 hover:border-primary/50 hover:text-primary">↻ regenerate</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>

  );
}

/* ---------- pieces ---------- */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-border/70 bg-card/60 px-1 font-mono text-[9px] text-foreground/80">
      {children}
    </kbd>
  );
}

function Chip({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] transition-all ${
        active
          ? "border-primary/60 bg-primary/15 text-primary shadow-sm shadow-primary/20"
          : "border-border/50 bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function Row({
  tool, active, fav, idx, reason, onEnter, onOpen, onFav,
}: {
  tool: Tool; active: boolean; fav: boolean; idx: number; reason?: string;
  onEnter: () => void; onOpen: () => void; onFav: () => void;
}) {
  let host = tool.url;
  try { host = new URL(tool.url).hostname.replace(/^www\./, ""); } catch {}
  return (
    <div
      data-idx={idx}
      onMouseEnter={onEnter}
      onClick={onOpen}
      className={`group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
        active ? "bg-primary/12 text-foreground" : "text-foreground/90 hover:bg-card/70"
      }`}
    >
      <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-md text-[11px] font-semibold uppercase ${
        active ? "bg-primary/25 text-primary" : "bg-muted/60 text-muted-foreground"
      }`}>
        {tool.name.slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[13.5px] font-medium">{tool.name}</span>
          <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">— {tool.section}</span>
        </div>
        <div className="truncate text-[11px] text-muted-foreground">
          {reason ? <span className="text-primary/80">✨ {reason}</span> : host}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onFav(); }}
        className={`shrink-0 rounded-md p-1.5 transition-colors ${
          fav ? "text-primary" : "text-muted-foreground/50 hover:text-foreground"
        }`}
        aria-label={fav ? "Unstar" : "Star"}
      >
        {fav ? <Star className="h-3.5 w-3.5 fill-current" /> : <StarOff className="h-3.5 w-3.5" />}
      </button>
      <ArrowUpRight className={`h-3.5 w-3.5 shrink-0 transition-colors ${
        active ? "text-primary" : "text-muted-foreground/50 group-hover:text-foreground"
      }`} />
    </div>
  );
}
