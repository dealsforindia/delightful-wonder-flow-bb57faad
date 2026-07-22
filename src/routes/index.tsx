import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search, Star, Zap } from "lucide-react";
import { TOOLS, CATEGORIES, type Category, type Tool } from "@/lib/tools-data";

export const Route = createFileRoute("/")({
  component: Directory,
});

type Filter = "all" | Category;

function Directory() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((t) => {
      if (cat !== "all" && t.category !== cat) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.section.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.url.toLowerCase().includes(q)
      );
    });
  }, [query, cat]);

  const grouped = useMemo(() => {
    const map = new Map<string, Tool[]>();
    for (const t of filtered) {
      const key = `${t.category} — ${t.section}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Zap className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium tracking-tight">
              fmhy<span className="text-muted-foreground">.mirror</span>
            </span>
          </div>
          <span className="hidden text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:inline">
            {TOOLS.length.toLocaleString()} starred tools
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 pt-14 pb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <Star className="h-3 w-3 text-primary" />
          Curated from FMHY
        </span>
        <h1 className="mt-5 text-4xl font-light leading-tight tracking-tight sm:text-6xl">
          Every ⭐ pick from FMHY,
          <span className="block text-primary">searchable in one page.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
          {TOOLS.length.toLocaleString()} community-starred tools across {CATEGORIES.length} categories.
          Mirrored from fmhy.net.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 1,600+ tools — 'yt-dlp', 'stream', 'ocr', 'pdf'..."
              className="w-full rounded-lg border border-border bg-background/60 py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Pill active={cat === "all"} onClick={() => setCat("all")}>
              All
            </Pill>
            {CATEGORIES.map((c) => (
              <Pill key={c} active={cat === c} onClick={() => setCat(c)}>
                {c}
              </Pill>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 text-xs text-muted-foreground">
          Showing <span className="text-foreground">{filtered.length.toLocaleString()}</span> of{" "}
          {TOOLS.length.toLocaleString()} tools
        </div>

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center text-sm text-muted-foreground">
            Nothing matches. Try a broader term.
          </div>
        )}

        <div className="space-y-10">
          {grouped.map(([label, tools]) => (
            <div key={label}>
              <div className="mb-4 flex items-baseline justify-between border-b border-border/40 pb-2">
                <h2 className="text-sm font-medium tracking-tight text-foreground">{label}</h2>
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {tools.length}
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((t) => (
                  <ToolCard key={t.url} tool={t} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-16 text-center text-xs text-muted-foreground/70">
          All credit to the FMHY community. This is a searchable mirror of their starred picks.
        </p>
      </section>
    </main>
  );
}

function Pill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
        active
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-transparent text-muted-foreground hover:border-primary/50 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function ToolCard({ tool }: { tool: Tool }) {
  let host = "";
  try {
    host = new URL(tool.url).hostname.replace(/^www\./, "");
  } catch {
    host = tool.url;
  }
  return (
    <a
      href={tool.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/30 px-3 py-2.5 transition-all hover:border-primary/50 hover:bg-card/60"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{tool.name}</div>
        <div className="truncate text-[11px] text-muted-foreground">{host}</div>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </a>
  );
}
