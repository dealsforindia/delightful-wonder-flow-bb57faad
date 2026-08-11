import { TOOLS } from "./tools-data.server";
import { createSearchIndex, searchTools, type SearchFilters } from "./search-tools";
import type { Tool } from "./tools-data";

let index: ReturnType<typeof createSearchIndex> | null = null;

function getIndex() {
  if (!index) index = createSearchIndex(TOOLS as Tool[]);
  return index;
}

export interface SearchPage {
  items: Tool[];
  total: number;
  totalTools: number;
}

export function searchToolsPaged(filters: SearchFilters & { limit?: number; offset?: number }): SearchPage {
  const limit = Math.min(Math.max(filters.limit ?? 100, 1), 300);
  const offset = Math.max(filters.offset ?? 0, 0);
  const all = searchTools(getIndex(), TOOLS as Tool[], filters);
  return {
    items: all.slice(offset, offset + limit),
    total: all.length,
    totalTools: TOOLS.length,
  };
}
