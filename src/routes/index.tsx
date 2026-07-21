import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { TOOLS, CATEGORIES, type Category, type Tool } from "@/lib/tools-data";

export const Route = createFileRoute("/")({
  component: Directory,
});

type Filter = "all" | Category;
type Access = "all" | "totally-free" | "no-signup";

function Directory() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Filter>("all");
  const [access, setAccess] = useState<Access>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((t) => {
      if (cat !== "all" && t.category !== cat) return false;
      if (access === "totally-free" && t.free !== "totally-free") return false;
      if (access === "no-signup" && t.signup !== "none") return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.tagline.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [query, cat, access]);

  const grouped = useMemo(() => {
    const map = new Map<Category, Tool[]>();
    for (const t of filtered) {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 text-primary">
              <Zap className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium tracking-tight">
              nosignup<span className="text-muted-foreground">.tools</span>
            </span>
          </div>
          <span className="hidden text-[10px] uppercase tracking-[0.25em] text-muted-foreground sm:inline">
            {TOOLS.length} tools · zero friction
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pt-16 pb-10 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" />
          Curated weekly
        </span>
        <h1 className="mt-5 text-4xl font-light leading-tight tracking-tight sm:text-6xl">
          The internet's best tools —
          <span className="block text-primary">no signup required.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
          Every tool here is free, fast, and works without a login wall. Bookmark this page.
        </p>
      </section>

      {/* Search + filters */}
      <section className="mx-auto max-w-6xl px-6">
        <div className="rounded-2xl border border-border/60 bg-card/40 p-4 backdrop-blur sm:p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 30+ tools — 'remove background', 'transcribe', 'regex'..."
              className="w-full rounded-lg border border-border bg-background/60 py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Pill active={cat === "all"} onClick={() => setCat("all")}>All</Pill>
            {CATEGORIES.map((c) => (
              <Pill key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Pill>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2 border-t border-border/40 pt-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 self-center mr-1">Access</span>
            <Pill small active={access === "all"} onClick={() => setAccess("all")}>Any</Pill>
            <Pill small active={access === "totally-free"} onClick={() => setAccess("totally-free")}>100% free</Pill>
            <Pill small active={access === "no-signup"} onClick={() => setAccess("no-signup")}>Zero signup</Pill>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="mx-auto max-w-6xl px-6 py-10">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center text-sm text-muted-foreground">
            No tools match. Try clearing filters.
          </div>
        )}

        <div className="space-y-10">
          {grouped.map(([category, tools]) => (
            <div key={category}>
              <div className="mb-4 flex items-baseline justify-between">
                <h2 className="text-lg font-medium tracking-tight">{category}</h2>
                <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {tools.length} {tools.length === 1 ? "tool" : "tools"}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tools.map((t) => (
                  <ToolCard key={t.name} tool={t} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-16 text-center text-xs text-muted-foreground/70">
          Missing a tool? Reply to us on X. Curated by humans, ranked by usage.
        </p>
      </section>
    </main>
  );
}

function Pill({
  children,
  active,
  onClick,
  small,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border transition-colors ${
        small ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
      } ${
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
  const accessLabel =
    tool.free === "totally-free" ? "100% free" : tool.free === "free-tier" ? "Free tier" : "Free trial";
  const signupLabel =
    tool.signup === "none" ? "No signup" : tool.signup === "optional" ? "Signup optional" : "Free account";

  return (
    <a
      href={tool.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="group relative flex flex-col rounded-xl border border-border/60 bg-card/40 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-card/60"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{tool.name}</span>
          {tool.highlight && (
            <span className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-[9px] uppercase tracking-wider text-accent">
              {tool.highlight}
            </span>
          )}
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{tool.tagline}</p>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
        <span className="inline-flex items-center gap-1 rounded-full border border-border/60 px-1.5 py-0.5 text-muted-foreground">
          <ShieldCheck className="h-2.5 w-2.5" />
          {accessLabel}
        </span>
        <span className="inline-flex items-center rounded-full border border-border/60 px-1.5 py-0.5 text-muted-foreground">
          {signupLabel}
        </span>
      </div>
    </a>
  );
}
