import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight, Search, Sparkles, Star, StarOff, Wand2, Play,
  Shield, Brain, Film, Music, Gamepad2, BookOpen, Download, Magnet,
  GraduationCap, Smartphone, Terminal, Languages, Globe, Wrench,
  Image as ImageIcon, Code2, Type, MessageSquare, PenTool, Package,
} from "lucide-react";
import { TOOLS, CATEGORIES, type Category, type Tool } from "@/lib/tools-data";
import { aiSearch } from "@/lib/ai-search.functions";
import { aiRecipe } from "@/lib/ai-recipe.functions";

export const Route = createFileRoute("/")({ component: Palette });

type Filter = "all" | "favorites" | Category;
const FAV_KEY = "fmhy.favs.v1";

/* fuzzy */
function score(hay: string, needle: string): number {
  if (!needle) return 1;
  hay = hay.toLowerCase(); needle = needle.toLowerCase();
  if (hay === needle) return 1000;
  if (hay.startsWith(needle)) return 800;
  const idx = hay.indexOf(needle);
  if (idx >= 0) return 500 - idx;
  let hi = 0, ni = 0, gaps = 0, last = -1;
  while (hi < hay.length && ni < needle.length) {
    if (hay[hi] === needle[ni]) { if (last >= 0) gaps += hi - last - 1; last = hi; ni++; }
    hi++;
  }
  if (ni < needle.length) return -1;
  return 200 - gaps;
}
function toolScore(t: Tool, q: string): number {
  if (!q) return 0;
  return Math.max(score(t.name, q) * 2, score(t.section, q), score(t.category, q), score(t.url, q) * 0.8);
}

/* category → icon + tint */
function catMeta(c: string): { Icon: typeof Shield; tint: string; bg: string } {
  const map: Record<string, { Icon: typeof Shield; tint: string; bg: string }> = {
    "Adblocking / Privacy": { Icon: Shield, tint: "text-rose-500", bg: "bg-rose-50" },
    AI: { Icon: Brain, tint: "text-violet-500", bg: "bg-violet-50" },
    Video: { Icon: Film, tint: "text-blue-500", bg: "bg-blue-50" },
    Audio: { Icon: Music, tint: "text-fuchsia-500", bg: "bg-fuchsia-50" },
    Gaming: { Icon: Gamepad2, tint: "text-emerald-500", bg: "bg-emerald-50" },
    Reading: { Icon: BookOpen, tint: "text-amber-600", bg: "bg-amber-50" },
    Downloading: { Icon: Download, tint: "text-teal-500", bg: "bg-teal-50" },
    Torrenting: { Icon: Magnet, tint: "text-orange-500", bg: "bg-orange-50" },
    Educational: { Icon: GraduationCap, tint: "text-indigo-500", bg: "bg-indigo-50" },
    "Android / iOS": { Icon: Smartphone, tint: "text-lime-600", bg: "bg-lime-50" },
    "Linux / macOS": { Icon: Terminal, tint: "text-slate-700", bg: "bg-slate-100" },
    "Non-English": { Icon: Languages, tint: "text-pink-500", bg: "bg-pink-50" },
    Internet: { Icon: Globe, tint: "text-sky-500", bg: "bg-sky-50" },
    Text: { Icon: Type, tint: "text-cyan-600", bg: "bg-cyan-50" },
    Image: { Icon: ImageIcon, tint: "text-purple-500", bg: "bg-purple-50" },
    Developer: { Icon: Code2, tint: "text-zinc-700", bg: "bg-zinc-100" },
    Social: { Icon: MessageSquare, tint: "text-blue-400", bg: "bg-blue-50" },
    Design: { Icon: PenTool, tint: "text-red-500", bg: "bg-red-50" },
    Storage: { Icon: Package, tint: "text-yellow-600", bg: "bg-yellow-50" },
  };
  return map[c] ?? { Icon: Wrench, tint: "text-slate-500", bg: "bg-slate-100" };
}

function Palette() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Filter>("all");
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<Array<{ tool: Tool; why: string }>>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<{ title: string; steps: Array<{ tool: Tool; action: string; output: string }> } | null>(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const runAiSearch = useServerFn(aiSearch);
  const runAiRecipe = useServerFn(aiRecipe);

  useEffect(() => {
    try { const raw = localStorage.getItem(FAV_KEY); if (raw) setFavs(new Set(JSON.parse(raw))); } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favs))); } catch {}
  }, [favs, ready]);

  const catCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of TOOLS) m.set(t.category, (m.get(t.category) ?? 0) + 1);
    return m;
  }, []);

  const fuzzyResults = useMemo(() => {
    const q = query.trim();
    let base = TOOLS as Tool[];
    if (cat === "favorites") base = base.filter((t) => favs.has(t.url));
    else if (cat !== "all") base = base.filter((t) => t.category === cat);
    if (!q) return base;
    const scored: Array<{ t: Tool; s: number }> = [];
    for (const t of base) { const s = toolScore(t, q); if (s > 0) scored.push({ t, s }); }
    scored.sort((a, b) => b.s - a.s);
    return scored.map((x) => x.t);
  }, [query, cat, favs]);

  const allResults = aiMode ? aiResults.map((r) => r.tool) : fuzzyResults;
  const [visible, setVisible] = useState(60);
  useEffect(() => setVisible(60), [query, cat, aiMode]);
  const results = allResults.slice(0, visible);

  const toggleFav = (url: string) => setFavs((prev) => { const n = new Set(prev); n.has(url) ? n.delete(url) : n.add(url); return n; });
  const open = (t: Tool) => window.open(t.url, "_blank", "noopener,noreferrer");

  const runAi = async () => {
    const q = query.trim(); if (q.length < 2) return;
    setAiMode(true); setAiLoading(true); setAiError(null); setAiResults([]);
    try { setAiResults(await runAiSearch({ data: { query: q } })); }
    catch (err) { setAiError(err instanceof Error ? err.message : "AI search failed"); }
    finally { setAiLoading(false); }
  };
  const exitAi = () => { setAiMode(false); setAiResults([]); setAiError(null); };
  const runRecipe = async () => {
    const q = query.trim(); if (q.length < 3) return;
    setRecipeLoading(true); setRecipe(null); setAiError(null);
    try { setRecipe(await runAiRecipe({ data: { goal: q } })); }
    catch (err) { setAiError(err instanceof Error ? err.message : "Recipe failed"); }
    finally { setRecipeLoading(false); }
  };
  const closeRecipe = () => setRecipe(null);

  const scrollToList = () => document.getElementById("directory")?.scrollIntoView({ behavior: "smooth" });

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* nav */}
      <nav className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <a href="/" className="flex items-center gap-2.5 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-brand-pink via-brand-purple to-brand-blue text-white shadow-sm">
              <Play className="h-3.5 w-3.5 fill-current" />
            </span>
            <span className="text-[15px] tracking-tight">FMHY</span>
            <span className="hidden text-[13px] font-normal text-muted-foreground sm:inline">Mirror</span>
          </a>
          <div className="hidden items-center gap-1 md:flex">
            <button onClick={scrollToList} className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Directory</button>
            <button onClick={() => { setCat("favorites"); scrollToList(); }} className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">Favorites</button>
            <a href="https://fmhy.net" target="_blank" rel="noreferrer" className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">About ↗</a>
          </div>
          <button onClick={() => inputRef.current?.focus()} className="flex items-center gap-2 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted">
            <Search className="h-3.5 w-3.5" /> Search
            <kbd className="hidden rounded border border-border bg-background px-1.5 text-[10px] font-medium sm:inline">⌘K</kbd>
          </button>
        </div>
      </nav>

      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-16 md:grid-cols-2 md:py-24">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-[12px] font-medium text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {TOOLS.length.toLocaleString()} tools indexed
            </div>
            <h1 className="bg-gradient-to-r from-brand-pink via-brand-purple to-brand-blue bg-clip-text text-5xl font-extrabold leading-[1.02] tracking-tight text-transparent sm:text-6xl md:text-7xl">
              freemediaheckyeah
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-snug text-muted-foreground">
              The largest collection of free stuff on the internet — searchable, AI-guided, and mirrored for speed.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <button onClick={scrollToList} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground transition-transform hover:scale-[1.02]">
                Browse tools <ArrowUpRight className="h-4 w-4" />
              </button>
              <button onClick={() => inputRef.current?.focus()} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-muted">
                <Search className="h-4 w-4" /> Search
              </button>
              <a href="https://discord.gg/fmhy" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-muted">
                Discord
              </a>
            </div>
          </div>

          {/* glow play mark */}
          <div className="relative mx-auto hidden aspect-square w-full max-w-md md:block">
            <div className="absolute inset-0 rounded-full bg-gradient-conic from-brand-cyan via-brand-purple to-brand-pink blur-3xl opacity-50"
              style={{ background: "conic-gradient(from 0deg, var(--brand-cyan), var(--brand-purple), var(--brand-pink), var(--brand-cyan))" }} />
            <div className="absolute inset-8 grid place-items-center">
              <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-2xl">
                <defs>
                  <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="white" />
                    <stop offset="100%" stopColor="white" stopOpacity="0.9" />
                  </linearGradient>
                </defs>
                <polygon points="70,50 160,100 70,150" fill="url(#pg)" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* search + AI */}
      <section id="directory" className="mx-auto max-w-7xl px-6 pb-6">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); if (aiMode) exitAi(); }}
                placeholder="Search 26,000+ tools — try 'remove background', 'youtube downloader'…"
                className="w-full rounded-xl border border-border bg-background py-3 pl-11 pr-4 text-[15px] outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
                spellCheck={false}
              />
            </div>
            <button
              onClick={() => (aiMode ? exitAi() : void runAi())}
              disabled={aiLoading || query.trim().length < 2}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-pink to-brand-purple px-5 py-3 text-[14px] font-medium text-white shadow-sm transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles className={`h-4 w-4 ${aiLoading ? "animate-pulse" : ""}`} />
              {aiLoading ? "Thinking…" : aiMode ? "Exit AI" : "Ask AI"}
            </button>
            <button
              onClick={() => void runRecipe()}
              disabled={recipeLoading || query.trim().length < 3}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-3 text-[14px] font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Wand2 className={`h-4 w-4 ${recipeLoading ? "animate-spin" : ""}`} />
              Recipe
            </button>
          </div>

          {aiMode && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-pink/10 to-brand-purple/10 px-3 py-2 text-[13px] text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-brand-purple" />
              <span className="truncate">
                {aiLoading ? "Scanning tools for the best match…" : aiError ? aiError : `AI picked ${aiResults.length} tools for “${query.trim()}”`}
              </span>
            </div>
          )}

          {/* try chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-muted-foreground">Try:</span>
            {["remove background", "youtube downloader", "learn japanese", "anonymous email"].map((s) => (
              <button key={s} onClick={() => { setQuery(s); inputRef.current?.focus(); }}
                className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* category cards (FMHY-style grid) */}
      {!query && cat === "all" && !aiMode && (
        <section className="mx-auto max-w-7xl px-6 py-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Or browse these pages ✨</h2>
            <span className="text-[12px] text-muted-foreground">{CATEGORIES.length} categories</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {CATEGORIES.map((c) => {
              const { Icon, tint, bg } = catMeta(c);
              return (
                <button key={c} onClick={() => { setCat(c); scrollToList(); }}
                  className="group rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md">
                  <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl ${bg}`}>
                    <Icon className={`h-5 w-5 ${tint}`} />
                  </div>
                  <h3 className="font-semibold tracking-tight">{c}</h3>
                  <p className="mt-1 text-[12px] text-muted-foreground">{(catCounts.get(c) ?? 0).toLocaleString()} tools</p>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* filter pills */}
      <section className="mx-auto max-w-7xl px-6 pt-6">
        <div className="flex flex-wrap gap-1.5">
          <Pill active={cat === "all"} onClick={() => setCat("all")}>All</Pill>
          <Pill active={cat === "favorites"} onClick={() => setCat("favorites")}>
            <Star className="h-3 w-3 fill-current" /> Favorites{favs.size > 0 && <span className="opacity-60">· {favs.size}</span>}
          </Pill>
          {CATEGORIES.map((c) => <Pill key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Pill>)}
        </div>
      </section>

      {/* list */}
      <section className="mx-auto max-w-7xl px-6 pb-24 pt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">
            {aiMode ? "AI Picks" : cat === "favorites" ? "Favorites" : cat === "all" ? "All tools" : cat}
          </h2>
          <span className="text-[12px] text-muted-foreground">{results.length.toLocaleString()} / {allResults.length.toLocaleString()}</span>
        </div>

        {results.length === 0 && !aiLoading && (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            {cat === "favorites" ? "No favorites yet. Star anything to pin it here." : "No matches."}
          </div>
        )}
        {aiLoading && (
          <div className="grid gap-2 sm:grid-cols-2">
            {[0,1,2,3,4,5].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/60" style={{ animationDelay: `${i*80}ms` }} />)}
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {!aiLoading && results.map((t, i) => (
            <Card key={t.url} tool={t} fav={favs.has(t.url)} reason={aiMode ? aiResults[i]?.why : undefined}
              onOpen={() => open(t)} onFav={() => toggleFav(t.url)} />
          ))}
        </div>

        {!aiLoading && results.length < allResults.length && (
          <button onClick={() => setVisible((v) => v + 120)}
            className="mx-auto mt-6 flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted">
            Load more <span className="text-muted-foreground">({(allResults.length - results.length).toLocaleString()} remaining)</span>
          </button>
        )}
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-6 py-6 text-[12px] text-muted-foreground sm:flex-row">
          <span>Mirror of <a href="https://fmhy.net" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">fmhy.net</a> · {TOOLS.length.toLocaleString()} tools</span>
          <span>Built for speed. Search, AI, recipes.</span>
        </div>
      </footer>

      {/* recipe modal */}
      {(recipe || recipeLoading) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:p-10" onClick={closeRecipe}>
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-brand-pink/10 to-brand-purple/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-brand-purple" />
                <span className="text-[13px] font-medium">Recipe</span>
              </div>
              <button onClick={closeRecipe} className="text-xs text-muted-foreground hover:text-foreground">Close ✕</button>
            </div>
            {recipeLoading && (
              <div className="space-y-3 p-6">
                <div className="h-6 w-2/3 animate-pulse rounded bg-muted" />
                {[0,1,2,3].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" style={{ animationDelay: `${i*120}ms` }} />)}
                <p className="pt-2 text-center text-[12px] text-muted-foreground">Composing a plan across 26,000+ tools…</p>
              </div>
            )}
            {recipe && !recipeLoading && (
              <div className="p-6">
                <h2 className="mb-1 text-2xl font-semibold tracking-tight">{recipe.title}</h2>
                <p className="mb-6 text-[12px] text-muted-foreground">{recipe.steps.length} steps · every tool is free</p>
                <ol className="space-y-3">
                  {recipe.steps.map((s, i) => (
                    <li key={i} className="flex gap-4 rounded-xl border border-border bg-background p-4">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-pink to-brand-purple text-[13px] font-semibold text-white">{i + 1}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] leading-snug">{s.action}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px]">
                          <a href={s.tool.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-foreground hover:bg-accent">
                            {s.tool.name} <ArrowUpRight className="h-3 w-3" />
                          </a>
                          <span className="text-muted-foreground">→ {s.output}</span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Pill({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
        active ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}>
      {children}
    </button>
  );
}

function Card({ tool, fav, reason, onOpen, onFav }: { tool: Tool; fav: boolean; reason?: string; onOpen: () => void; onFav: () => void }) {
  let host = tool.url;
  try { host = new URL(tool.url).hostname.replace(/^www\./, ""); } catch {}
  const { Icon, tint, bg } = catMeta(tool.category);
  return (
    <div onClick={onOpen}
      className="group flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${bg}`}>
        <Icon className={`h-5 w-5 ${tint}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[15px] font-semibold tracking-tight">{tool.name}</h3>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
        <p className="truncate text-[12px] text-muted-foreground">
          {reason ? <span className="text-brand-purple">✨ {reason}</span> : <>{tool.section} · {host}</>}
        </p>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onFav(); }}
        className={`shrink-0 rounded-md p-1.5 transition-colors ${fav ? "text-amber-500" : "text-muted-foreground/50 hover:bg-muted hover:text-foreground"}`}
        aria-label={fav ? "Unstar" : "Star"}>
        {fav ? <Star className="h-4 w-4 fill-current" /> : <StarOff className="h-4 w-4" />}
      </button>
    </div>
  );
}
