import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { FmhyLayout } from "@/components/FmhyLayout";
import { aiSearch } from "@/lib/ai-search.functions";
import { aiRecipe, aiSwapStep } from "@/lib/ai-recipe.functions";
import { getToolsCount } from "@/lib/tools-data.functions";
import type { Tool } from "@/lib/tools-data";
import {
  RoadmapStepCard,
  roadmapToMarkdown,
  encodeRoadmap,
  type Roadmap,
  type RoadmapStep,
} from "@/components/RoadmapCard";

type AiSearchParams = { q?: string; mode?: "search" | "roadmap"; r?: string };

export const Route = createFileRoute("/ai")({
  validateSearch: (search: Record<string, unknown>): AiSearchParams => ({
    q: typeof search.q === "string" ? search.q : undefined,
    mode: search.mode === "roadmap" ? "roadmap" : search.mode === "search" ? "search" : undefined,
    r: typeof search.r === "string" ? search.r : undefined,
  }),
  head: () => ({
    meta: [
      { title: "AI Concierge — find tools & build roadmaps · Unlocked" },
      {
        name: "description",
        content:
          "Describe what you want to do. AI picks the right free tools from 26,000+ Unlocked entries and builds an interactive step-by-step roadmap you can refine, swap, and share.",
      },
      { property: "og:title", content: "Unlocked AI Concierge" },
      { property: "og:description", content: "Ask in plain English. Get tools + an interactive roadmap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiRoute,
});

type SearchHit = { i: number; tool: Tool; why: string };

const PROGRESS_KEY = "unlocked.roadmap.progress.v1";

function loadProgress(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}");
  } catch {
    return {};
  }
}
function saveProgress(next: Record<string, boolean>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
}

function decodeRoadmapFromUrl(r: string): Roadmap | null {
  try {
    const json = decodeURIComponent(escape(atob(r)));
    const parsed = JSON.parse(json) as {
      t?: string;
      m?: number;
      s?: Array<{ i: number; a: string; o: string; w?: string; e?: number }>;
    };
    if (!parsed.s) return null;
    // Rehydrate tools from indexes we can't reach on client; use minimal shape.
    const steps: RoadmapStep[] = parsed.s.map((s) => ({
      i: s.i,
      tool: { name: `Tool #${s.i}`, url: "#", category: "", section: "", subcategory: "" } as Tool,
      action: s.a,
      output: s.o,
      why: s.w ?? "",
      estMinutes: s.e ?? 20,
    }));
    return {
      title: parsed.t ?? "Shared roadmap",
      totalMinutes: parsed.m ?? steps.reduce((n, s) => n + s.estMinutes, 0),
      steps,
    };
  } catch {
    return null;
  }
}

function AiRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const fetchCount = useServerFn(getToolsCount);
  const { data: count } = useQuery({ queryKey: ["tools-count"], queryFn: () => fetchCount() });
  const runSearch = useServerFn(aiSearch);
  const runRecipe = useServerFn(aiRecipe);
  const runSwap = useServerFn(aiSwapStep);

  const [mode, setMode] = useState<"search" | "roadmap">(search.mode ?? "search");
  const [q, setQ] = useState(search.q ?? "");
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refineText, setRefineText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [swappingIdx, setSwappingIdx] = useState<number | null>(null);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<null | "md" | "link">(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  // hydrate roadmap from shared URL
  useEffect(() => {
    if (search.r && !roadmap) {
      const r = decodeRoadmapFromUrl(search.r);
      if (r) {
        setMode("roadmap");
        setRoadmap(r);
      }
    }
     
  }, [search.r]);

  async function execute(query: string, m: "search" | "roadmap") {
    if (query.length < 3) return;
    setLoading(true);
    setErr(null);
    setHits(null);
    setRoadmap(null);
    setRefineText("");
    try {
      if (m === "search") {
        const res = await runSearch({ data: { query } });
        setHits(res as SearchHit[]);
      } else {
        const res = await runRecipe({ data: { goal: query } });
        setRoadmap(res as Roadmap);
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (search.q && search.q.trim().length >= 3 && !search.r) {
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

  async function refine(e?: React.FormEvent) {
    e?.preventDefault();
    const r = refineText.trim();
    if (r.length < 2) return;
    setRefining(true);
    setErr(null);
    try {
      if (mode === "search" && hits) {
        const res = await runSearch({
          data: { query: q.trim(), refine: r, previousIds: hits.map((h) => h.i) },
        });
        setHits(res as SearchHit[]);
      } else if (mode === "roadmap" && roadmap) {
        const res = await runRecipe({
          data: {
            goal: q.trim(),
            refine: r,
            previous: {
              title: roadmap.title,
              steps: roadmap.steps.map((s) => ({
                i: s.i,
                action: s.action,
                output: s.output,
                why: s.why,
                estMinutes: s.estMinutes,
              })),
            },
          },
        });
        setRoadmap(res as Roadmap);
      }
      setRefineText("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Refine failed");
    } finally {
      setRefining(false);
    }
  }

  async function swapStep(idx: number) {
    if (!roadmap) return;
    const step = roadmap.steps[idx];
    setSwappingIdx(idx);
    try {
      const res = (await runSwap({
        data: {
          goal: q.trim() || roadmap.title,
          stepAction: step.action,
          currentToolId: step.i,
          category: step.tool.category,
          section: step.tool.section,
          exclude: roadmap.steps.map((s) => s.i),
        },
      })) as { i?: number; tool: Tool | null; why?: string };
      if (res.tool && typeof res.i === "number") {
        const nextSteps = [...roadmap.steps];
        nextSteps[idx] = { ...step, i: res.i, tool: res.tool, why: res.why || step.why };
        setRoadmap({ ...roadmap, steps: nextSteps });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Swap failed");
    } finally {
      setSwappingIdx(null);
    }
  }

  const progressKey = useMemo(() => (roadmap ? `${roadmap.title}::${q}` : ""), [roadmap, q]);
  const doneCount = useMemo(() => {
    if (!roadmap) return 0;
    return roadmap.steps.filter((_, i) => progress[`${progressKey}::${i}`]).length;
  }, [roadmap, progress, progressKey]);

  function toggleDone(idx: number) {
    const key = `${progressKey}::${idx}`;
    const next = { ...progress, [key]: !progress[key] };
    setProgress(next);
    saveProgress(next);
  }

  async function copyMarkdown() {
    if (!roadmap) return;
    await navigator.clipboard.writeText(roadmapToMarkdown(roadmap));
    setCopied("md");
    setTimeout(() => setCopied(null), 1500);
  }
  async function copyShareLink() {
    if (!roadmap) return;
    const enc = encodeRoadmap(roadmap);
    const url = `${window.location.origin}/ai?r=${enc}`;
    await navigator.clipboard.writeText(url);
    setCopied("link");
    setTimeout(() => setCopied(null), 1500);
  }

  const examples =
    mode === "search"
      ? [
          "remove background from image without watermark",
          "download youtube playlist as mp3",
          "anonymous disposable email",
          "read paywalled articles",
        ]
      : [
          "launch an anonymous blog for free",
          "self-host my own Netflix",
          "learn a language from zero in 30 days",
          "back up my whole digital life",
        ];

  return (
    <FmhyLayout>
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-brand-pink animate-pulse" />
          AI Concierge · powered by Gemini · indexes {count?.toLocaleString() ?? "26,000+"} tools
        </div>
        <h1 className="mt-3 text-4xl md:text-5xl font-extrabold tracking-tight">
          Ask.{" "}
          <span className="bg-gradient-to-r from-brand-pink via-brand-purple to-brand-blue bg-clip-text text-transparent">
            Get the right free tool.
          </span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Describe your goal in plain English. AI reads the whole Unlocked index and picks tools that fit — or builds a
          multi-step, interactive roadmap you can check off, swap, and share.
        </p>

        <div className="mt-6 inline-flex p-1 rounded-lg border border-border bg-muted">
          <button
            onClick={() => setMode("search")}
            className={`px-4 py-1.5 text-sm rounded-md ${
              mode === "search" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
            }`}
          >
            🔎 Find tools
          </button>
          <button
            onClick={() => setMode("roadmap")}
            className={`px-4 py-1.5 text-sm rounded-md ${
              mode === "roadmap" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"
            }`}
          >
            🗺️ Build a roadmap
          </button>
        </div>

        <form onSubmit={run} className="mt-4 flex gap-2">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              mode === "search"
                ? "e.g. record my screen without watermark"
                : "e.g. start a private newsletter for free"
            }
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
              onClick={() => {
                setQ(ex);
              }}
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
              key={`${h.i}-${i}`}
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
          {hits.length === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center">No matches. Try a different phrasing.</div>
          )}
        </div>
      )}

      {roadmap && !loading && (
        <div className="mt-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{roadmap.title}</h2>
              <div className="mt-1 text-xs text-muted-foreground">
                {roadmap.steps.length} steps · ~{roadmap.totalMinutes} min total · {doneCount}/{roadmap.steps.length} done
              </div>
              {roadmap.keywords && roadmap.keywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {roadmap.keywords.map((k) => (
                    <span
                      key={k}
                      className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyMarkdown}
                className="text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-accent"
              >
                {copied === "md" ? "✓ Copied" : "📋 Copy as markdown"}
              </button>
              <button
                onClick={copyShareLink}
                className="text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-accent"
              >
                {copied === "link" ? "✓ Copied" : "🔗 Share link"}
              </button>
            </div>
          </div>

          {/* progress bar */}
          <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-pink via-brand-purple to-brand-blue transition-all"
              style={{
                width: `${roadmap.steps.length ? (doneCount / roadmap.steps.length) * 100 : 0}%`,
              }}
            />
          </div>

          <div className="mt-6 relative">
            <div className="absolute left-4 top-2 bottom-2 w-px bg-gradient-to-b from-brand-pink via-brand-purple to-brand-blue" />
            <ol className="space-y-3">
              {roadmap.steps.map((s, i) => (
                <RoadmapStepCard
                  key={`${s.i}-${i}`}
                  step={s}
                  index={i}
                  done={!!progress[`${progressKey}::${i}`]}
                  onToggleDone={() => toggleDone(i)}
                  onSwap={() => swapStep(i)}
                  swapping={swappingIdx === i}
                />
              ))}
            </ol>
          </div>
          {roadmap.steps.length === 0 && (
            <div className="text-sm text-muted-foreground py-8">AI couldn't build a plan. Try rephrasing.</div>
          )}
        </div>
      )}

      {/* Refine follow-up */}
      {(hits || roadmap) && !loading && (
        <form onSubmit={refine} className="mt-8 max-w-3xl">
          <label className="text-xs uppercase tracking-widest text-muted-foreground">
            Refine — e.g. "cheaper options", "no signup only", "add a step for hosting"
          </label>
          <div className="mt-2 flex gap-2">
            <input
              value={refineText}
              onChange={(e) => setRefineText(e.target.value)}
              placeholder={mode === "roadmap" ? "make it faster, add a step for X…" : "no signup, cheaper, mac only…"}
              className="flex-1 h-11 px-4 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={refining || refineText.trim().length < 2}
              className="px-4 h-11 rounded-xl border border-border bg-background font-medium disabled:opacity-50 hover:bg-accent"
            >
              {refining ? "Refining…" : "Refine ↻"}
            </button>
          </div>
        </form>
      )}
    </FmhyLayout>
  );
}
