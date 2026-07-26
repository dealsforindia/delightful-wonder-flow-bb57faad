import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { TOOLS } from "@/lib/tools-data.server";
import type { Tool } from "@/lib/tools-data";

export default defineTool({
  name: "browse_category",
  title: "Browse category",
  description:
    "List all tools in a given FMHY category. Optionally filter by section (e.g. 'Text-To-Image AI'). Use list_categories to discover valid categories and sections.",
  inputSchema: {
    category: z.string().describe("Category name, e.g. 'AI', 'Video', 'Privacy'."),
    section: z.string().optional().describe("Optional section name to filter within the category."),
    limit: z.number().int().min(1).max(500).default(100).describe("Maximum number of tools to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ category, section, limit }) => {
    const c = category.toLowerCase();
    const s = section?.toLowerCase();
    let results: Tool[] = TOOLS.filter((t) => t.category.toLowerCase() === c);
    if (s) results = results.filter((t) => t.section.toLowerCase() === s);
    results = results.slice(0, limit);
    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      structuredContent: { count: results.length, results },
    };
  },
});
