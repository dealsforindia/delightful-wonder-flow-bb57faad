import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { PAGES } from "@/lib/fmhy-pages";

export function FmhyLayout({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

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

  function askAi(mode: "search" | "roadmap") {
    const query = q.trim();
    if (query.length < 3) return;
    navigate({ to: "/ai", search: { q: query, mode } });
    setQ("");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="mx-auto max-w-[1400px] px-4 md:px-6 h-14 flex items-center gap-4">
          <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">☰</button>
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="inline-block h-6 w-6 rounded bg-gradient-to-br from-brand-pink via-brand-purple to-brand-blue" />
            <span className="hidden sm:inline">freemediaheckyeah</span>
            <span className="sm:hidden">fmhy</span>
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
              onKeyDown={(e) => { if (e.key === "Enter") askAi("search"); }}
              placeholder="Search sections or ask AI…"
              className="w-72 h-9 px-3 rounded-l-lg bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
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
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title="Toggle theme"
            className="ml-2 h-9 w-9 grid place-items-center rounded-lg border border-border hover:bg-accent text-sm"
          >
            {dark ? "☀️" : "🌙"}
          </button>

        </div>
        {q && (
          <div className="border-t border-border bg-popover">
            <div className="mx-auto max-w-[1400px] px-4 md:px-6 py-3 grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {filtered.slice(0, 12).map((p) => (
                <Link key={p.slug} to="/$page" params={{ page: p.slug }} className="p-2 rounded hover:bg-accent text-sm">
                  <span className="font-medium" style={{ color: p.color }}>{p.title}</span>
                  <span className="block text-xs text-muted-foreground truncate">{p.details}</span>
                </Link>
              ))}
              {filtered.length === 0 && (
                <button onClick={() => askAi("search")} className="p-2 rounded hover:bg-accent text-sm text-left col-span-full">
                  <span className="font-medium">✨ Ask AI: "{q}"</span>
                  <span className="block text-xs text-muted-foreground">No sections matched — let AI search all 26k tools</span>
                </button>
              )}
            </div>
          </div>
        )}
      </header>
      <div className="mx-auto max-w-[1400px] px-4 md:px-6 grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr_260px] gap-8 py-8">
        <aside className={`${open ? "block" : "hidden"} md:block`}>
          <SideNav pathname={pathname} />
        </aside>
        <main className="min-w-0">{children}</main>
        <aside className="hidden lg:block">{aside}</aside>
      </div>
      <footer className="border-t border-border mt-16 py-8 text-center text-xs text-muted-foreground">
        Community mirror of <a href="https://fmhy.net" className="underline" target="_blank" rel="noopener noreferrer">fmhy.net</a> · content by the FMHY community
      </footer>
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
    <nav className="text-sm space-y-6 sticky top-20">
      {groups.map(([label, items]) => (
        <div key={label}>
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-2">{label}</div>
          <ul className="space-y-0.5">
            {items.map((p) => {
              const to = `/${p.slug}`;
              const active = pathname === to;
              return (
                <li key={p.slug}>
                  <Link
                    to="/$page"
                    params={{ page: p.slug }}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md border-l-2 ${active ? "bg-accent border-current font-medium" : "border-transparent hover:bg-accent/60"}`}
                    style={active ? { color: p.color } : undefined}
                  >
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
                    {p.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
