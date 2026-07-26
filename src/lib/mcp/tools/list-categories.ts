import { defineTool } from "@lovable.dev/mcp-js";
import { TOOLS } from "@/lib/tools-data.server";

export default defineTool({
  name: "list_categories",
  title: "List categories",
  description:
    "List every category in the FMHY directory with tool counts and the sections within each category.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const byCat = new Map<string, { count: number; sections: Map<string, number> }>();
    for (const t of TOOLS) {
      const c = byCat.get(t.category) ?? { count: 0, sections: new Map() };
      c.count++;
      c.sections.set(t.section, (c.sections.get(t.section) ?? 0) + 1);
      byCat.set(t.category, c);
    }
    const categories = Array.from(byCat.entries())
      .map(([category, v]) => ({
        category,
        count: v.count,
        sections: Array.from(v.sections.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => b.count - a.count);
    return {
      content: [{ type: "text", text: JSON.stringify(categories, null, 2) }],
      structuredContent: { total: TOOLS.length, categories },
    };
  },
});
