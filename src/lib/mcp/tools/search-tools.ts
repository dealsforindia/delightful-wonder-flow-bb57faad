import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { TOOLS, type Tool } from "@/lib/tools-data";

function score(hay: string, needle: string): number {
  if (!needle) return 0;
  const h = hay.toLowerCase();
  const n = needle.toLowerCase();
  if (h === n) return 1000;
  if (h.startsWith(n)) return 800;
  const idx = h.indexOf(n);
  if (idx >= 0) return 500 - idx;
  let hi = 0, ni = 0, gaps = 0, last = -1;
  while (hi < h.length && ni < n.length) {
    if (h[hi] === n[ni]) {
      if (last >= 0) gaps += hi - last - 1;
      last = hi;
      ni++;
    }
    hi++;
  }
  if (ni < n.length) return -1;
  return 200 - gaps;
}

function toolScore(t: Tool, q: string): number {
  return Math.max(
    score(t.name, q) * 2,
    score(t.section, q),
    score(t.category, q),
    score(t.url, q) * 0.8,
  );
}

export default defineTool({
  name: "search_tools",
  title: "Search FMHY tools",
  description:
    "Fuzzy-search the curated FMHY directory of 300 free tools by name, section, category, or URL. Returns the top matches with their category, section, and URL.",
  inputSchema: {
    query: z.string().min(1).describe("Search text (e.g. 'remove background', 'youtube downloader', 'anonymous email')."),
    category: z.string().optional().describe("Optional category filter (e.g. 'AI', 'Video', 'Privacy')."),
    limit: z.number().int().min(1).max(50).default(15).describe("Maximum number of results to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, category, limit }) => {
    let base: Tool[] = TOOLS;
    if (category) {
      const c = category.toLowerCase();
      base = base.filter((t) => t.category.toLowerCase() === c);
    }
    const scored: Array<{ t: Tool; s: number }> = [];
    for (const t of base) {
      const s = toolScore(t, query);
      if (s > 0) scored.push({ t, s });
    }
    scored.sort((a, b) => b.s - a.s);
    const results = scored.slice(0, limit).map(({ t }) => t);
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      structuredContent: { count: results.length, results },
    };
  },
});
