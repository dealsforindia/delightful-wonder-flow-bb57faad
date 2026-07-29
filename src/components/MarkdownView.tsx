import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { ExternalLink } from "lucide-react";

export function MarkdownView({ source }: { source: string }) {
  return (
    <article className="prose-fmhy">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap" }]]}
        components={{
          a: ({ href, children, ...rest }) => {
            const external = href && /^https?:\/\//.test(href);
            return (
              <a
                {...rest}
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="text-primary hover:underline inline-flex items-center gap-0.5"
              >
                {children}
                {external && <ExternalLink className="h-3 w-3 opacity-60" />}
              </a>
            );
          },
          h1: ({ children, ...rest }) => <h1 {...rest} className="text-3xl md:text-4xl font-bold tracking-tight mt-8 mb-4 text-foreground">{children}</h1>,
          h2: ({ children, ...rest }) => <h2 {...rest} className="text-2xl font-semibold tracking-tight mt-10 mb-3 pt-4 border-t border-border text-primary">{children}</h2>,
          h3: ({ children, ...rest }) => <h3 {...rest} className="text-lg font-semibold mt-6 mb-2 text-foreground">{children}</h3>,
          ul: ({ children, ...rest }) => <ul {...rest} className="list-disc pl-6 space-y-1 my-3">{children}</ul>,
          ol: ({ children, ...rest }) => <ol {...rest} className="list-decimal pl-6 space-y-1 my-3">{children}</ol>,
          p: ({ children, ...rest }) => <p {...rest} className="my-3 leading-relaxed text-muted-foreground">{children}</p>,
          blockquote: ({ children, ...rest }) => (
            <blockquote {...rest} className="border-l-4 border-primary/70 bg-muted/60 rounded-r px-4 py-2 my-4 text-sm">{children}</blockquote>
          ),
          code: ({ children, ...rest }) => <code {...rest} className="px-1.5 py-0.5 rounded bg-muted text-[0.85em] font-mono text-primary">{children}</code>,
          hr: () => <hr className="my-8 border-border" />,
          img: ({ src, alt }) => <img src={src} alt={alt} loading="lazy" className="rounded-lg my-4" />,
        }}
      >
        {source}
      </ReactMarkdown>
    </article>
  );
}

export function TableOfContents() {
  const [items, setItems] = useState<Array<{ id: string; text: string; level: number }>>([]);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const collect = () => {
      const hs = Array.from(document.querySelectorAll<HTMLHeadingElement>(".prose-fmhy h2, .prose-fmhy h3"));
      setItems(hs.map((h) => ({ id: h.id, text: h.textContent || "", level: h.tagName === "H2" ? 2 : 3 })));
    };
    collect();
    const t = setTimeout(collect, 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    for (const it of items) {
      const el = document.getElementById(it.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [items]);

  const memo = useMemo(() => items, [items]);
  if (memo.length === 0) return null;
  return (
    <nav className="sticky top-20 text-sm">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">On this page</div>
      <ul className="space-y-1 max-h-[70vh] overflow-auto pr-2">
        {memo.map((h) => (
          <li key={h.id} className={h.level === 3 ? "pl-3" : ""}>
            <a
              href={`#${h.id}`}
              className={`block truncate py-0.5 hover:text-primary transition-colors ${active === h.id ? "text-primary font-medium" : "text-muted-foreground"}`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
