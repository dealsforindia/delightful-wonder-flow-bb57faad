import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PAGES } from "@/lib/fmhy-pages";
import { searchContent, type SectionResult } from "@/lib/content-search";

export function FmhyLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setNavOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem("fmhy-theme");
    const prefers = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = saved ? saved === "dark" : prefers;
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("fmhy-theme", next ? "dark" : "light");
  }

  const filtered = q.trim()
    ? PAGES.filter((p) => (p.title + " " + p.short + " " + p.details).toLowerCase().includes(q.toLowerCase()))
    : PAGES;

  const sectionHits: SectionResult[] = useMemo(
    () => (q.trim().length >= 2 ? searchContent(q, 8) : []),
    [q],
  );

  function askAi(mode: "search" | "roadmap") {
    const query = q.trim();
    if (query.length < 3) return;
    navigate({ to: "/ai", search: { q: query, mode } });
    setQ("");
    setSearchOpen(false);
  }

  function doSearch() {
    const query = q.trim();
    if (!query) return;
    navigate({ to: "/browse", search: { q: query } });
    setQ("");
    setSearchOpen(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6 h-14 flex items-center gap-3">
          <button
            className="md:hidden h-9 w-9 grid place-items-center rounded-lg border border-border hover:bg-accent"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight shrink-0">
            <span className="inline-block h-6 w-6 rounded bg-gradient-to-br from-brand-pink via-brand-purple to-brand-blue" />
            <span className="hidden sm:inline">Unlocked</span>
            <span className="sm:hidden">U</span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1 text-sm ml-4">
            <Link to="/ai" className="px-3 py-1.5 rounded hover:bg-accent font-medium bg-gradient-to-r from-brand-pink/10 to-brand-blue/10">✨ AI</Link>
            <Link to="/beginners-guide" className="px-3 py-1.5 rounded hover:bg-accent">Guide</Link>
            <Link to="/posts" className="px-3 py-1.5 rounded hover:bg-accent">Posts</Link>
            <Link to="/browse" className="px-3 py-1.5 rounded hover:bg-accent">Browse all</Link>
          </nav>

          <div className="flex-1" />
          <div className="hidden md:flex items-stretch">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
              placeholder="Search tools…"
              className="w-72 h-9 px-3 rounded-l-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={doSearch}
              disabled={!q.trim()}
              title="Search tools"
              className="h-9 px-2.5 text-xs font-medium border-y border-border hover:bg-accent disabled:opacity-40"
            >
              🔍
            </button>
            <button
              onClick={() => askAi("search")}
              disabled={q.trim().length < 3}
              title="Ask AI to find tools"
              className="h-9 px-2.5 text-xs font-medium border-y border-border bg-gradient-to-r from-brand-pink/15 to-brand-purple/15 hover:from-brand-pink/25 hover:to-brand-purple/25 disabled:opacity-40"
            >
              ✨ Ask
            </button>
            <button
              onClick={() => askAi("roadmap")}
              disabled={q.trim().length < 3}
              title="Build a step-by-step plan"
              className="h-9 px-2.5 text-xs font-medium border rounded-r-lg border-border bg-gradient-to-r from-brand-purple/15 to-brand-blue/15 hover:from-brand-purple/25 hover:to-brand-blue/25 disabled:opacity-40"
            >
              🗺️ Plan
            </button>
          </div>
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="md:hidden h-9 w-9 grid place-items-center rounded-lg border border-border hover:bg-accent text-sm"
          >
            🔍
          </button>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title="Toggle theme"
            className="h-9 w-9 grid place-items-center rounded-lg border border-border hover:bg-accent text-sm"
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </div>

        {q && (
          <div className="border-t border-border bg-popover hidden md:block">
            <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-3 space-y-3">
              <button onClick={doSearch} className="w-full p-2 rounded hover:bg-accent text-sm text-left border border-border bg-muted/40">
                <span className="font-medium">🔍 Search all tools for "{q}"</span>
                <span className="block text-xs text-muted-foreground">Press Enter — fuzzy search the full 26k index</span>
              </button>

              {sectionHits.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1">In the wiki</div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {sectionHits.map((h, i) => (
                      <a
                        key={`${h.pageSlug}-${h.anchor}-${i}`}
                        href={`/${h.pageSlug}#${h.anchor}`}
                        onClick={() => { setQ(""); setSearchOpen(false); }}
                        className="p-2 rounded hover:bg-accent text-sm border border-border/60"
                      >
                        <span className="text-[10px] uppercase tracking-wider" style={{ color: h.pageColor }}>{h.pageTitle}</span>
                        <span className="block font-medium truncate">{h.heading}</span>
                        <span className="block text-xs text-muted-foreground line-clamp-2">{h.snippet}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {filtered.length > 0 && (
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 px-1">Pages</div>
                  <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {filtered.slice(0, 9).map((p) => (
                      <Link key={p.slug} to="/$page" params={{ page: p.slug }} className="p-2 rounded hover:bg-accent text-sm">
                        <span className="font-medium" style={{ color: p.color }}>{p.title}</span>
                        <span className="block text-xs text-muted-foreground truncate">{p.details}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => askAi("search")} className="w-full p-2 rounded hover:bg-accent text-sm text-left">
                <span className="font-medium">✨ Ask AI instead</span>
                <span className="block text-xs text-muted-foreground">Get recommendations & a plan for "{q}"</span>
              </button>
            </div>
          </div>
        )}
      </header>

      <div className={`mx-auto max-w-[1400px] px-4 md:px-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6 md:gap-8 py-6 md:py-8 ${aside ? "lg:grid-cols-[240px_1fr_260px]" : "lg:grid-cols-[240px_1fr]"}`}>
        <aside className="hidden md:block">
          <SideNav pathname={pathname} />
        </aside>
        <main className="min-w-0">{children}</main>
        <aside className="hidden lg:block">{aside}</aside>
      </div>

      <footer className="border-t border-border mt-12 md:mt-16 py-8 text-center text-xs text-muted-foreground">
        Unlocked · a fast, searchable index of free tools and resources
      </footer>

      {navOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setNavOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[280px] bg-background border-r border-border flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
                <span className="inline-block h-6 w-6 rounded bg-gradient-to-br from-brand-pink via-brand-purple to-brand-blue" />
                Unlocked
              </Link>
              <button onClick={() => setNavOpen(false)} className="h-8 w-8 grid place-items-center rounded-lg border border-border hover:bg-accent">✕</button>
            </div>
            <div className="p-3 border-b border-border grid grid-cols-2 gap-2">
              <Link to="/ai" className="px-3 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-brand-pink/15 to-brand-blue/15 border border-border text-center">✨ AI</Link>
              <Link to="/browse" className="px-3 py-2 rounded-lg text-sm font-medium border border-border text-center hover:bg-accent">Browse all</Link>
              <Link to="/beginners-guide" className="px-3 py-2 rounded-lg text-sm font-medium border border-border text-center hover:bg-accent">Guide</Link>
              <Link to="/posts" className="px-3 py-2 rounded-lg text-sm font-medium border border-border text-center hover:bg-accent">Posts</Link>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <SideNav pathname={pathname} />
            </div>
            <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span>Theme</span>
              <button onClick={toggleTheme} className="h-8 px-3 rounded-lg border border-border hover:bg-accent">
                {dark ? "☀️ Light" : "🌙 Dark"}
              </button>
            </div>
          </div>
        </div>
      )}

      {searchOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-background flex flex-col">
          <div className="flex items-center gap-2 p-3 border-b border-border">
          <input
            autoFocus
            data-testid="mobile-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
            placeholder="Search tools…"
            className="flex-1 h-10 px-3 rounded-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
            <button onClick={() => setSearchOpen(false)} className="h-10 px-3 rounded-lg border border-border hover:bg-accent text-sm">Cancel</button>
          </div>
          <div className="p-3 flex gap-2">
            <button
              onClick={() => askAi("search")}
              disabled={q.trim().length < 3}
              className="flex-1 h-10 rounded-lg text-sm font-medium border border-border bg-gradient-to-r from-brand-pink/15 to-brand-purple/15 disabled:opacity-40"
            >
              ✨ Ask AI
            </button>
            <button
              onClick={() => askAi("roadmap")}
              disabled={q.trim().length < 3}
              className="flex-1 h-10 rounded-lg text-sm font-medium border border-border bg-gradient-to-r from-brand-purple/15 to-brand-blue/15 disabled:opacity-40"
            >
              🗺️ Plan
            </button>
          </div>
          <div className="flex-1 min-h-0 p-3 grid gap-2 overflow-y-auto content-start">
            <Link to="/browse" search={{ q: q.trim() || undefined }} className="p-3 rounded-lg border border-border bg-muted/40 hover:bg-accent text-sm">
              <span className="font-medium">🔍 Browse all 26k tools{q.trim() ? ` for "${q}"` : ""}</span>
              <span className="block text-xs text-muted-foreground">Fast fuzzy search across the full Unlocked index</span>
            </Link>
            {sectionHits.map((h, i) => (
              <a
                key={`m-${h.pageSlug}-${h.anchor}-${i}`}
                href={`/${h.pageSlug}#${h.anchor}`}
                onClick={() => { setQ(""); setSearchOpen(false); }}
                className="p-3 rounded-lg border border-border/60 hover:bg-accent text-sm"
              >
                <span className="text-[10px] uppercase tracking-wider" style={{ color: h.pageColor }}>{h.pageTitle}</span>
                <span className="block font-medium">{h.heading}</span>
                <span className="block text-xs text-muted-foreground line-clamp-2">{h.snippet}</span>
              </a>
            ))}
            {filtered.slice(0, 20).map((p) => (
              <Link key={p.slug} to="/$page" params={{ page: p.slug }} className="p-3 rounded-lg border border-border hover:bg-accent text-sm">
                <span className="font-medium" style={{ color: p.color }}>{p.title}</span>
                <span className="block text-xs text-muted-foreground truncate">{p.details}</span>
              </Link>
            ))}
            {q.trim() && filtered.length === 0 && (
              <button onClick={() => askAi("search")} className="p-3 rounded-lg border border-border hover:bg-accent text-sm text-left">
                <span className="font-medium">✨ Ask AI: "{q}"</span>
                <span className="block text-xs text-muted-foreground">No sections matched — let AI search all 26k tools</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SideNav({ pathname }: { pathname: string }) {
  const groups: Array<[string, typeof PAGES]> = [
    ["Main", PAGES.filter((p) => p.group === "main")],
    ["Tools", PAGES.filter((p) => p.group === "tools")],
    ["Meta", PAGES.filter((p) => p.group === "meta")],
  ];
  return (
    <nav className="text-sm space-y-6 md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto md:pr-2">
      {groups.map(([label, items]) => (
        <div key={label}>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-2">{label}</div>
          <ul className="space-y-0.5">
            {items.map((p) => {
              const to = `/${p.slug}`;
              const active = !p.href && pathname === to;
              const cls = `flex items-center gap-2 px-2 py-1.5 rounded-md border-l-2 ${active ? "bg-accent border-current font-medium" : "border-transparent hover:bg-accent/60"}`;
              return (
                <li key={p.slug}>
                  {p.href ? (
                    <a href={p.href} className={cls}>
                      <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
                      {p.title}
                    </a>
                  ) : (
                    <Link
                      to="/$page"
                      params={{ page: p.slug }}
                      className={cls}
                      style={active ? { color: p.color } : undefined}
                    >
                      <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ background: p.color }} />
                      {p.title}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
