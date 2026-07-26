import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { FmhyLayout } from "@/components/FmhyLayout";
import { TOOLS, CATEGORIES } from "@/lib/tools-data";

export const Route = createFileRoute("/browse")({
  head: () => ({
    meta: [
      { title: "Browse all tools — FMHY mirror" },
      { name: "description", content: `Search across ${TOOLS.length} FMHY tools by name, category or section.` },
      { property: "og:title", content: "Browse all FMHY tools" },
      { property: "og:description", content: "Fuzzy search across every FMHY tool." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BrowseRoute,
});

function BrowseRoute() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [visible, setVisible] = useState(300);

  useEffect(() => setVisible(300), [q, cat]);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    let out = TOOLS;
    if (cat) out = out.filter((t) => t.category === cat);
    if (query) {
      out = out.filter((t) =>
        (t.name + " " + t.section + " " + t.category + " " + t.url).toLowerCase().includes(query),
      );
    }
    return out;
  }, [q, cat]);

  return (
    <FmhyLayout>
      <div className="max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Browse all tools</h1>
        <p className="text-muted-foreground mt-2">Search across {TOOLS.length.toLocaleString()} FMHY entries.</p>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search anything…"
          className="mt-6 w-full h-12 px-4 rounded-xl bg-muted border border-border focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setCat("")}
            className={`px-3 py-1 text-xs rounded-full border ${cat === "" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`px-3 py-1 text-xs rounded-full border ${cat === c ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          Showing {Math.min(visible, results.length).toLocaleString()} of {results.length.toLocaleString()}
        </div>
      </div>

      <div className="mt-6 grid gap-2">
        {results.slice(0, visible).map((t, i) => (
          <a
            key={i}
            href={t.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-baseline gap-3 p-3 rounded-lg border border-border hover:border-brand-blue hover:bg-accent/40 transition-colors"
          >
            <span className="text-xs text-muted-foreground w-10 tabular-nums">{i + 1}</span>
            <span className="font-medium group-hover:text-brand-blue truncate">{t.name}</span>
            <span className="text-xs text-muted-foreground truncate">{t.section}</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
              {t.category}
            </span>
          </a>
        ))}
        {results.length === 0 && <div className="text-sm text-muted-foreground py-12 text-center">No results.</div>}
      </div>

      {visible < results.length && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setVisible((v) => v + 500)}
            className="px-6 py-2.5 rounded-lg border border-border hover:bg-accent text-sm font-medium"
          >
            Load more
          </button>
        </div>
      )}

      <div className="mt-10">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to home</Link>
      </div>
    </FmhyLayout>
  );
}
