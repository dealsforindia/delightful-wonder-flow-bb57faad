import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Sparkles, BookOpen } from "lucide-react";
import { FmhyLayout } from "@/components/FmhyLayout";
import { PAGES } from "@/lib/fmhy-pages";
import { getToolsCount } from "@/lib/tools-data.functions";
import { getIconscoutIcon } from "@/lib/iconscout.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Unlocked — the largest collection of free stuff on the internet" },
      { name: "description", content: "Unlocked — 26,000+ free tools, guides and resources across AI, streaming, gaming, learning, privacy, and more." },
      { property: "og:title", content: "Unlocked — the largest collection of free stuff on the internet" },
      { property: "og:description", content: "The largest collection of free stuff on the internet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomeRoute,
});

function HomeRoute() {
  const fetchCount = useServerFn(getToolsCount);
  const { data: count } = useQuery({ queryKey: ["tools-count"], queryFn: () => fetchCount() });
  const main = PAGES.filter((p) => p.group === "main");
  const tools = PAGES.filter((p) => p.group === "tools");
  return (
    <FmhyLayout>
      <section className="text-center py-12 md:py-20 relative">
        <div className="mx-auto mb-6 h-24 w-24 rounded-full ring-4 ring-primary/60 overflow-hidden shadow-[0_0_60px_-10px_var(--primary)]">
          <img src="/logo.jpg" alt="Unlocked" className="h-full w-full object-cover" />
        </div>
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter break-words fracture-title">
          <span className="ft-un">Un</span>
          <span className="relative inline-block">
            <span className="ft-locked">locked</span>
            <span className="ft-slice ft-slice-top" aria-hidden="true">locked</span>
            <span className="ft-slice ft-slice-bottom" aria-hidden="true">locked</span>
            <span className="ft-scanline" aria-hidden="true"></span>
          </span>
          <span className="ft-reflection" aria-hidden="true">
            <span className="ft-un">Un</span>
            <span className="ft-locked">locked</span>
          </span>
        </h1>

        <p className="mt-5 text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
          Your cheat code to the free internet. Tools, guides & goldmines — one search bar.
        </p>
        <div className="mt-3 text-xs text-muted-foreground font-mono">
          [ {count?.toLocaleString() ?? "26,000+"} entries · {PAGES.length} pages ]
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Link to="/browse" className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:brightness-110 shadow-[0_0_30px_-8px_var(--primary)] inline-flex items-center gap-2">Browse all tools <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/ai" className="px-6 py-3 rounded-lg border border-border hover:bg-accent font-medium inline-flex items-center gap-2"><Sparkles className="h-4 w-4" /> Ask AI</Link>
          <Link to="/$page" params={{ page: "beginners-guide" }} className="px-6 py-3 rounded-lg border border-border hover:bg-accent font-medium inline-flex items-center gap-2"><BookOpen className="h-4 w-4" /> Beginners Guide</Link>
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
  const fetchIcon = useServerFn(getIconscoutIcon);
  const { data } = useQuery({
    queryKey: ["iconscout", p.short],
    queryFn: () => fetchIcon({ data: { query: p.short } }),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  const iconUrl = data?.url;
  return (
    <Link
      to="/$page"
      params={{ page: p.slug }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card hover:border-current transition-colors p-4 flex gap-3"
      style={{ ["--tw-border-opacity" as string]: 1 }}
    >
      <span
        className="mt-0.5 shrink-0 h-10 w-10 rounded-lg grid place-items-center text-lg font-bold overflow-hidden"
        style={{ background: `${p.color}22`, color: p.color }}
        aria-hidden="true"
      >
        {iconUrl ? (
          <img
            src={iconUrl}
            alt=""
            className="h-7 w-7 object-contain icon-invert"
            loading="lazy"
          />
        ) : (
          p.short.slice(0, 2).toUpperCase()
        )}
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
