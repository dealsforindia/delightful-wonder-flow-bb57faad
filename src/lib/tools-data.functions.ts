import { createServerFn } from "@tanstack/react-start";
import { TOOLS } from "./tools-data.server";
import type { Tool } from "./tools-data";

export const getToolsCount = createServerFn({ method: "GET" }).handler(async () => TOOLS.length);

export const getTools = createServerFn({ method: "GET" }).handler(async () => TOOLS as Tool[]);

export const searchToolsFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const d = (data ?? {}) as Record<string, unknown>;
    return {
      q: typeof d.q === "string" ? d.q : undefined,
      category: typeof d.category === "string" ? d.category : undefined,
      sort: (d.sort === "name" || d.sort === "category" ? d.sort : "relevance") as
        | "relevance"
        | "name"
        | "category",
      limit: typeof d.limit === "number" ? d.limit : 100,
      offset: typeof d.offset === "number" ? d.offset : 0,
    };
  })
  .handler(async ({ data }) => {
    const { searchToolsPaged } = await import("./tools-search.server");
    return searchToolsPaged(data);
  });
