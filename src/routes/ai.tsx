import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FmhyLayout } from "@/components/FmhyLayout";
import { aiSearch } from "@/lib/ai-search.functions";
import { aiRecipe } from "@/lib/ai-recipe.functions";
import { getToolsCount } from "@/lib/tools-data.functions";
import type { Tool } from "@/lib/tools-data";

type AiSearch = { q?: string; mode?: "search" | "roadmap" };

export const Route = createFileRoute("/ai")({
  validateSearch: (search: Record<string, unknown>): AiSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    mode: search.mode === "roadmap" ? "roadmap" : search.mode === "search" ? "search" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "AI Concierge — find tools & build roadmaps · FMHY mirror" },
      { name: "description", content: "Describe what you want to do. AI picks the right free tools from 26,000+ FMHY entries and builds a step-by-step roadmap." },
      { property: "og:title", content: "FMHY AI Concierge" },
      { property: "og:description", content: "Ask in plain English. Get tools + a roadmap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiRoute,
});

type SearchHit = { tool: Tool; why: string };
type RecipeStep = { tool: Tool; action: string; output: string };
type Recipe = { title: string; steps: RecipeStep[] };

function AiRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"search" | "roadmap">(search.mode ?? "search");
  const [q, setQ] = useState(search.q ?? "");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);

  async function execute(query: string, m: "search" | "roadmap") {
    if (query.length < 3) return;
    setLoading(true);
    setErr(null);
    setHits(null);
    setRecipe(null);
    try {
      if (m === "search") {
        const res = await aiSearch({ data: { query } });
        setHits(res as SearchHit[]);
      } else {
        const res = await aiRecipe({ data: { goal: query } });
        setRecipe(res as Recipe);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Auto-run when arriving with ?q=&mode= from the header search
  useEffect(() => {
    if (search.q && search.q.trim().length >= 3) {
      const m = search.mode ?? "search";
      setMode(m);
      setQ(search.q);
      execute(search.q.trim(), m);
    }
     
  }, [search.q, search.mode]);

  async function run(e?: React.FormEvent) {
    e?.preventDefault();
    const query = q.trim();
    if (query.length < 3) return;
    navigate({ to: "/ai", search: { q: query, mode }, replace: true });
    execute(query, mode);
  }


  const examples =
    mode === "search"
      ? ["remove background from image without watermark", "download youtube playlist as mp3", "anonymous disposable email", "read paywalled articles"]
      : ["launch an anonymous blog for free", "self-host my own Netflix", "learn a language from zero in 30 days", "back up my whole digital life"];

  return (
    <FmhyLayout>
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-brand-pink animate-pulse" />
          AI Concierge · powered by Gemini · indexes {TOOLS.length.toLocaleString()} tools
        </div>
        <h1 className="mt-3 text-4xl md:text-5xl font-extrabold tracking-tight">
          Ask.{" "}
          <span className="bg-gradient-to-r from-brand-pink via-brand-purple to-brand-blue bg-clip-text text-transparent">
            Get the right free tool.
          </span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Describe your goal in plain English. AI reads the whole FMHY index and picks tools that fit — or builds a multi-step roadmap chaining several of them together.
        </p>

        <div className="mt-6 inline-flex p-1 rounded-lg border border-border bg-muted">
          <button
            onClick={() => setMode("search")}
            className={`px-4 py-1.5 text-sm rounded-md ${mode === "search" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
          >
            🔎 Find tools
          </button>
          <button
            onClick={() => setMode("roadmap")}
            className={`px-4 py-1.5 text-sm rounded-md ${mode === "roadmap" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
          >
            🗺️ Build a roadmap
          </button>
        </div>

        <form onSubmit={run} className="mt-4 flex gap-2">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={mode === "search" ? "e.g. record my screen without watermark" : "e.g. start a private newsletter for free"}
            className="flex-1 h-12 px-4 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={loading || q.trim().length < 3}
            className="px-5 h-12 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            {loading ? "Thinking…" : mode === "search" ? "Ask AI" : "Plan it"}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {examples.map((ex) => (
            <button
              key={ex}
              onClick={() => { setQ(ex); }}
              className="px-2.5 py-1 text-xs rounded-full border border-border hover:bg-accent text-muted-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {err && (
        <div className="mt-6 p-4 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-destructive">
          {err}
        </div>
      )}

      {loading && (
        <div className="mt-8 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {hits && !loading && (
        <div className="mt-8 space-y-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Top {hits.length} matches</div>
          {hits.map((h, i) => (
            <a
              key={i}
              href={h.tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 p-4 rounded-lg border border-border hover:border-brand-purple hover:bg-accent/40 transition-colors"
            >
              <span className="text-xs text-muted-foreground w-6 tabular-nums pt-1">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-semibold group-hover:text-brand-purple">{h.tool.name}</span>
                  <span className="text-xs text-muted-foreground">{h.tool.section}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {h.tool.category}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{h.why}</p>
                <div className="mt-1 text-xs text-brand-blue truncate">{h.tool.url}</div>
              </div>
            </a>
          ))}
          {hits.length === 0 && <div className="text-sm text-muted-foreground py-8 text-center">No matches. Try a different phrasing.</div>}
        </div>
      )}

      {recipe && !loading && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold tracking-tight">{recipe.title}</h2>
          <div className="mt-4 relative">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-brand-pink via-brand-purple to-brand-blue" />
            <ol className="space-y-3">
              {recipe.steps.map((s, i) => (
                <li key={i} className="relative pl-12">
                  <span className="absolute left-0 top-2 h-8 w-8 rounded-full bg-gradient-to-br from-brand-pink to-brand-purple text-primary-foreground grid place-items-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="text-sm">{s.action}</div>
                    <a
                      href={s.tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-brand-blue hover:underline"
                    >
                      → {s.tool.name}
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">{s.tool.category}</span>
                    </a>
                    <div className="mt-1 text-xs text-muted-foreground">✓ {s.output}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          {recipe.steps.length === 0 && <div className="text-sm text-muted-foreground py-8">AI couldn't build a plan. Try rephrasing.</div>}
        </div>
      )}
    </FmhyLayout>
  );
}
