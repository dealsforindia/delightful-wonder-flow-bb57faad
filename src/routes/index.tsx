import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Command, CornerDownLeft, Search, Star, StarOff } from "lucide-react";
import { TOOLS, CATEGORIES, type Category, type Tool } from "@/lib/tools-data";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // load favs after hydration
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

  // auto-focus + cmd-k
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

  const results = useMemo(() => {
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

  useEffect(() => setCursor(0), [query, cat]);

  // keep highlighted item visible
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

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const t = results[cursor]; if (t) open(t); }
    else if (e.key === "Tab") {
      e.preventDefault();
      const filters: Filter[] = ["all", "favorites", ...CATEGORIES];
      const i = filters.indexOf(cat);
      setCat(filters[(i + (e.shiftKey ? -1 : 1) + filters.length) % filters.length]);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      {/* ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[380px] w-[520px] rounded-full bg-secondary/15 blur-[120px]" />
        <div className="absolute bottom-0 -left-40 h-[380px] w-[520px] rounded-full bg-accent/10 blur-[120px]" />
      </div>

      {/* top bar */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/30">
              <Command className="h-3.5 w-3.5" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold tracking-tight">fmhy palette</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {TOOLS.length.toLocaleString()} tools · press ⌘K
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:flex">
            <Kbd>↑↓</Kbd> nav <Kbd>↵</Kbd> open <Kbd>Tab</Kbd> filter
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 pt-14 pb-6 text-center">
        <h1 className="text-4xl font-light leading-[1.05] tracking-tight sm:text-6xl">
          The whole free internet,
          <span className="block bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            in one keystroke.
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Type anything. Arrow keys to pick. Star what matters. Zero tracking, zero fluff.
        </p>
      </section>

      {/* palette */}
      <section className="mx-auto max-w-3xl px-5">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/50 shadow-2xl shadow-black/40 backdrop-blur-2xl">
          <div className="relative border-b border-border/50">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search 1,600+ tools…"
              className="w-full bg-transparent py-4 pl-11 pr-16 text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              spellCheck={false}
              autoComplete="off"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] tabular-nums text-muted-foreground">
              {results.length}
            </div>
          </div>

          <div className="flex gap-1.5 overflow-x-auto border-b border-border/40 px-3 py-2 scrollbar-none">
            <Chip active={cat === "all"} onClick={() => setCat("all")}>All</Chip>
            <Chip active={cat === "favorites"} onClick={() => setCat("favorites")}>
              ★ {favs.size > 0 && <span className="ml-1 text-muted-foreground">{favs.size}</span>}
            </Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>
            ))}
          </div>

          <div ref={listRef} className="max-h-[58vh] overflow-y-auto p-1.5">
            {results.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground">
                {cat === "favorites" ? "No favorites yet. Star anything to pin it here." : "No matches."}
              </div>
            )}
            {results.map((t, i) => (
              <Row
                key={t.url}
                tool={t}
                active={i === cursor}
                fav={favs.has(t.url)}
                idx={i}
                onEnter={() => setCursor(i)}
                onOpen={() => open(t)}
                onFav={() => toggleFav(t.url)}
              />
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border/40 bg-background/40 px-4 py-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            <span className="truncate">
              {results[cursor]?.category ?? "—"} · {results[cursor]?.section ?? ""}
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              open <Kbd><CornerDownLeft className="h-2.5 w-2.5" /></Kbd>
            </span>
          </div>
        </div>

        <p className="my-10 text-center text-[11px] text-muted-foreground/70">
          Community-curated by FMHY. This is a keyboard-first mirror.
        </p>
      </section>
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
  tool, active, fav, idx, onEnter, onOpen, onFav,
}: {
  tool: Tool; active: boolean; fav: boolean; idx: number;
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
        <div className="truncate text-[11px] text-muted-foreground">{host}</div>
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
