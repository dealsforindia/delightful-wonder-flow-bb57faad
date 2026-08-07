import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { rankTools } from "./ai-tools.server";

const InputSchema = z.object({
  query: z.string().min(2).max(300),
  refine: z.string().max(300).optional(),
  previousIds: z.array(z.number().int().nonnegative()).max(20).optional(),
  limit: z.number().int().min(1).max(20).default(8),
});

export const aiSearch = createServerFn({ method: "POST" })
  .validator((data) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const ranked = await rankTools(data.query, data.refine, data.limit, data.previousIds, "");

    return ranked.map(({ i, tool, why }) => ({
      i,
      name: tool.name,
      url: tool.url,
      category: tool.category,
      section: tool.section,
      description: tool.description ?? "",
      tags: tool.tags ?? [],
      why,
    }));
  });
