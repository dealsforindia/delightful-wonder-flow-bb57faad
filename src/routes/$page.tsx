import { createFileRoute, notFound } from "@tanstack/react-router";
import { FmhyLayout } from "@/components/FmhyLayout";
import { MarkdownView, TableOfContents } from "@/components/MarkdownView";
import { getPageMarkdown, hasPage } from "@/lib/page-content";
import { PAGE_MAP } from "@/lib/fmhy-pages";
import { ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/$page")({
  loader: ({ params }) => {
    if (!hasPage(params.page)) throw notFound();
    return { slug: params.page, md: getPageMarkdown(params.page)! };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] };
    const meta = PAGE_MAP[loaderData.slug];
    const title = meta ? `${meta.title} — Unlocked` : "Unlocked";
    const desc = meta?.details ?? "Free tools and resources from the FMHY community.";
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: PageRoute,
});

function PageRoute() {
  const { slug, md } = Route.useLoaderData();
  const meta = PAGE_MAP[slug];
  return (
    <FmhyLayout aside={<TableOfContents />}>
      {meta && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <span
              className="inline-block h-4 w-4 rounded-full shadow-[0_0_14px_-3px_currentColor]"
              style={{ background: meta.color }}
            />
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{meta.group}</div>
          </div>
          <div className="hidden sm:block h-1 w-1 rounded-full bg-muted-foreground/40" />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: meta.color }}>
            {meta.title}
          </h1>
        </div>
      )}
      <MarkdownView source={md} />
      <div className="mt-12 pt-6 border-t border-border">
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 transition">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>
      </div>
    </FmhyLayout>
  );
}
