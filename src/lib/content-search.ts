// FMHY-style full-content search: indexes every wiki page by section (##/###
// headings) and matches against heading + body text. Lazy-built on first call.

import { PAGE_MAP } from "./fmhy-pages";

const raw = import.meta.glob("../content/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export interface SectionResult {
  pageSlug: string;
  pageTitle: string;
  pageColor: string;
  heading: string;
  anchor: string;
  snippet: string;
  score: number;
}

interface Section {
  pageSlug: string;
  heading: string;
  anchor: string;
  headingLower: string;
  body: string;
  bodyLower: string;
}

// GitHub-slugger-ish: strip markdown, lowercase, non-alphanum → "-".
function slugify(s: string): string {
  return s
    .replace(/[*_`]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function stripMd(s: string): string {
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`>#]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

let INDEX: Section[] | null = null;

function buildIndex(): Section[] {
  const out: Section[] = [];
  for (const [path, md] of Object.entries(raw)) {
    const slug = path.split("/").pop()!.replace(/\.md$/, "");
    if (!PAGE_MAP[slug]) continue;
    const lines = md.split("\n");
    let cur: { heading: string; body: string[] } | null = null;
    const flush = () => {
      if (!cur) return;
      const heading = stripMd(cur.heading);
      if (!heading) return;
      const body = cur.body.join("\n");
      out.push({
        pageSlug: slug,
        heading,
        anchor: slugify(heading),
        headingLower: heading.toLowerCase(),
        body,
        bodyLower: body.toLowerCase(),
      });
    };
    for (const line of lines) {
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        flush();
        cur = { heading: h[2], body: [] };
      } else if (cur) {
        cur.body.push(line);
      }
    }
    flush();
  }
  return out;
}

function makeSnippet(section: Section, q: string): string {
  const idx = section.bodyLower.indexOf(q);
  const plain = stripMd(section.body);
  if (idx < 0) return plain.slice(0, 140);
  const plainLower = plain.toLowerCase();
  const pIdx = plainLower.indexOf(q);
  if (pIdx < 0) return plain.slice(0, 140);
  const start = Math.max(0, pIdx - 40);
  const end = Math.min(plain.length, pIdx + q.length + 100);
  return (start > 0 ? "…" : "") + plain.slice(start, end) + (end < plain.length ? "…" : "");
}

export function searchContent(query: string, limit = 8): SectionResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  if (!INDEX) INDEX = buildIndex();
  const tokens = q.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length === 0) return [];

  const scored: Array<{ s: Section; score: number }> = [];
  for (const s of INDEX) {
    let score = 0;
    let allHit = true;
    for (const t of tokens) {
      const hHit = s.headingLower.includes(t);
      const bHit = s.bodyLower.includes(t);
      if (hHit) score += s.headingLower === t ? 100 : s.headingLower.startsWith(t) ? 40 : 25;
      if (bHit) score += 3;
      if (!hHit && !bHit) { allHit = false; break; }
    }
    if (!allHit) continue;
    scored.push({ s, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ s, score }) => {
    const meta = PAGE_MAP[s.pageSlug];
    return {
      pageSlug: s.pageSlug,
      pageTitle: meta?.title ?? s.pageSlug,
      pageColor: meta?.color ?? "#888",
      heading: s.heading,
      anchor: s.anchor,
      snippet: makeSnippet(s, q),
      score,
    };
  });
}
