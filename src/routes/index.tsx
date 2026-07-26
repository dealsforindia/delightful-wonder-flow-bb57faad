import { createFileRoute, Link } from "@tanstack/react-router";
import { FmhyLayout } from "@/components/FmhyLayout";
import { PAGES } from "@/lib/fmhy-pages";
import { TOOLS } from "@/lib/tools-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "freemediaheckyeah — the largest collection of free stuff on the internet" },
      { name: "description", content: "A community mirror of FMHY: 26,000+ free tools, guides and resources across AI, streaming, gaming, learning, privacy, and more." },
      { property: "og:title", content: "freemediaheckyeah — mirror" },
      { property: "og:description", content: "The largest collection of free stuff on the internet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomeRoute,
});

function HomeRoute() {
  const main = PAGES.filter((p) => p.group === "main");
  const tools = PAGES.filter((p) => p.group === "tools");
  return (
    <FmhyLayout>
      <section className="text-center py-10 md:py-16">
        <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-border bg-muted/50 mb-6">
          🔒 Fight Chat Control
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter bg-gradient-to-r from-brand-pink via-brand-purple to-brand-blue bg-clip-text text-transparent">
          freemediaheckyeah
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">The largest collection of free stuff on the internet.</p>
        <div className="mt-3 text-xs text-muted-foreground">
          Mirroring {TOOLS.length.toLocaleString()} entries across {PAGES.length} pages.
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link to="/$page" params={{ page: "beginners-guide" }} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90">See Beginners Guide</Link>
          <Link to="/$page" params={{ page: "posts" }} className="px-5 py-2.5 rounded-lg border border-border hover:bg-accent">Posts</Link>
          <Link to="/browse" className="px-5 py-2.5 rounded-lg border border-border hover:bg-accent">Browse all tools</Link>
          <a href="https://github.com/fmhy/edit" target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 rounded-lg border border-border hover:bg-accent">Contribute</a>
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-4">Or browse these pages</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {main.map((p) => <PageCard key={p.slug} p={p} />)}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-4">Tool sections</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map((p) => <PageCard key={p.slug} p={p} />)}
        </div>
      </section>
    </FmhyLayout>
  );
}

function PageCard({ p }: { p: (typeof PAGES)[number] }) {
  return (
    <Link
      to="/$page"
      params={{ page: p.slug }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card hover:border-current transition-colors p-4 flex gap-3"
      style={{ ["--tw-border-opacity" as string]: 1 }}
    >
      <span
        className="mt-0.5 shrink-0 h-10 w-10 rounded-lg grid place-items-center text-lg font-bold"
        style={{ background: `${p.color}22`, color: p.color }}
      >
        {p.short.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0">
        <div className="font-semibold group-hover:text-current" style={{ ["--hover-color" as string]: p.color }}>
          {p.title}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{p.details}</p>
      </div>
    </Link>
  );
}
