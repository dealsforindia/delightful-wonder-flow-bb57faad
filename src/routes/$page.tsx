import { createFileRoute, notFound } from "@tanstack/react-router";
import { FmhyLayout } from "@/components/FmhyLayout";
import { MarkdownView, TableOfContents } from "@/components/MarkdownView";
import { getPageMarkdown, hasPage } from "@/lib/page-content";
import { PAGE_MAP } from "@/lib/fmhy-pages";

export const Route = createFileRoute("/$page")({
  loader: ({ params }) => {
    if (!hasPage(params.page)) throw notFound();
    return { slug: params.page, md: getPageMarkdown(params.page)! };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Not found" }, { name: "robots", content: "noindex" }] };
    const meta = PAGE_MAP[loaderData.slug];
    const title = meta ? `${meta.title} — FMHY` : "FMHY";
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
        <div className="mb-6 flex items-center gap-3">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: meta.color }} />
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{meta.group}</div>
        </div>
      )}
      <MarkdownView source={md} />
    </FmhyLayout>
  );
}
