import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState, useDeferredValue } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowLeft, Check, Link2, Search, Sparkles } from "lucide-react";
import { FmhyLayout } from "@/components/FmhyLayout";
import { getTools } from "@/lib/tools-data.functions";
import { CATEGORIES } from "@/lib/tools-data";
import { createSearchIndex, searchTools } from "@/lib/search-tools";
import type { Tool } from "@/lib/tools-data";

const SORTS = [
  { value: "relevance", label: "Relevance" },
  { value: "name", label: "Name" },
  { value: "category", label: "Category" },
] as const;

type Sort = (typeof SORTS)[number]["value"];

interface BrowseSearch {
  q?: string;
  cat?: string;
  sort?: Sort;
}

export const Route = createFileRoute("/browse")({
  validateSearch: (search: Record<string, unknown>): BrowseSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    cat: typeof search.cat === "string" ? search.cat : undefined,
    sort: SORTS.map((s) => s.value).includes(search.sort as Sort) ? (search.sort as Sort) : "relevance",
  }),
  head: () => ({
    meta: [
      { title: "Browse all tools — Unlocked" },
      { name: "description", content: "Fuzzy search across every free tool by name, category, or section." },
      { property: "og:title", content: "Browse all Unlocked tools" },
      { property: "og:description", content: "Fuzzy search across every free tool." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrowseRoute,
});

function BrowseRoute() {
  const search = useSearch({ from: "/browse" });
  const navigate = useNavigate({ from: "/browse" });
  const fetchTools = useServerFn(getTools);

  const { data: tools, isLoading: toolsLoading, error } = useQuery({
    queryKey: ["tools"],
    queryFn: () => fetchTools(),
    staleTime: 5 * 60 * 1000,
  });

  const index = useMemo(() => (tools ? createSearchIndex(tools) : null), [tools]);
  const deferredQ = useDeferredValue(search.q ?? "");

  const results = useMemo(() => {
    if (!tools || !index) return [];
    return searchTools(index, tools, {
      q: deferredQ,
      category: search.cat,
      sort: search.sort ?? "relevance",
    });
  }, [tools, index, deferredQ, search.cat, search.sort]);

  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  const [copied, setCopied] = useState(false);

  function update(params: Partial<BrowseSearch>) {
    navigate({ search: (prev: BrowseSearch) => ({ ...prev, ...params }) });
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked — no-op */
    }
  }


  return (
    <FmhyLayout>
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Browse all <span className="text-primary">tools</span>
        </h1>
        <p className="text-muted-foreground mt-2">
          {tools ? `Search across ${tools.length.toLocaleString()} entries.` : "Loading the index…"}
        </p>

        <div className="relative mt-6 max-w-2xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={search.q ?? ""}
            onChange={(e) => update({ q: e.target.value || undefined })}
            placeholder="Search anything…"
            className="w-full h-12 pl-10 pr-4 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
          />
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
            <button
              onClick={() => update({ cat: undefined })}
              className={`shrink-0 px-3 py-1.5 text-xs rounded-full border transition-colors ${
                !search.cat ? "bg-primary text-primary-foreground border-primary shadow-[0_0_14px_-6px_var(--primary)]" : "border-border hover:bg-accent hover:border-primary/40"
              }`}
            >
              All
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => update({ cat: search.cat === c ? undefined : c })}
                className={`shrink-0 px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  search.cat === c ? "bg-primary text-primary-foreground border-primary shadow-[0_0_14px_-6px_var(--primary)]" : "border-border hover:bg-accent hover:border-primary/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sort</span>
            <select
              value={search.sort ?? "relevance"}
              onChange={(e) => update({ sort: e.target.value as Sort })}
              className="h-8 px-2 rounded-md bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={copyLink}
              title="Copy a link to this exact search"
              className="h-8 shrink-0 inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Link2 className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Share"}
            </button>
          </div>
        </div>


        <div className="mt-3 text-xs text-muted-foreground">
          {toolsLoading ? "Loading…" : `Showing ${results.length.toLocaleString()} result${results.length === 1 ? "" : "s"}`}
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-destructive">
          Failed to load tools: {error.message}
        </div>
      )}

      <div
        ref={parentRef}
        className="mt-6 h-[60vh] sm:h-[65vh] overflow-y-auto rounded-xl border border-border"
      >
        {results.length === 0 && !toolsLoading ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
            <span>
              Nothing matched{search.q ? ` “${search.q}”` : ""}
              {search.cat ? ` in ${search.cat}` : ""}.
            </span>
            <Link
              to="/ai"
              search={search.q ? { q: search.q } : undefined}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-3 py-1.5 text-xs text-primary transition-colors hover:bg-primary/10"
            >
              <Sparkles className="h-3.5 w-3.5" /> Ask the AI instead
            </Link>
          </div>
        ) : (

          <div
            className="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const t = results[virtualItem.index];
              if (!t) return null;
              return (
                <div
                  key={virtualItem.key}
                  className="absolute left-0 w-full"
                  style={{
                    transform: `translateY(${virtualItem.start}px)`,
                    height: `${virtualItem.size}px`,
                  }}
                >
                  <ToolRow tool={t} index={virtualItem.index} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-10">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 transition">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </div>
    </FmhyLayout>
  );
}

function ToolRow({ tool, index }: { tool: Tool; index: number }) {
  return (
    <a
      href={tool.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 border-b border-border hover:bg-accent/40 transition-colors min-h-[64px]"
    >
      <span className="text-xs text-muted-foreground w-6 sm:w-8 tabular-nums shrink-0">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
          <span className="font-medium group-hover:text-primary truncate transition-colors">{tool.name}</span>
          <span className="text-xs text-muted-foreground truncate">{tool.section}</span>
        </div>
      </div>
      <span className="shrink-0 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
        {tool.category}
      </span>
    </a>
  );
}
