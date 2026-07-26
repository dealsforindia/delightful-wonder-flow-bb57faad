import Fuse from "fuse.js";
import type { Tool } from "./tools-data";

export interface SearchFilters {
  q?: string;
  category?: string;
  sort?: "relevance" | "name" | "category";
}

const options = {
  keys: [
    { name: "name", weight: 0.45 },
    { name: "section", weight: 0.3 },
    { name: "category", weight: 0.2 },
    { name: "url", weight: 0.05 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

export function createSearchIndex(tools: Tool[]) {
  return new Fuse(tools, options);
}

export function searchTools(index: Fuse<Tool>, tools: Tool[], filters: SearchFilters): Tool[] {
  const { q, category } = filters;
  const effectiveSort = q?.trim() ? (filters.sort ?? "relevance") : "name";
  const base = category ? tools.filter((t) => t.category.toLowerCase() === category.toLowerCase()) : tools;

  if (!q?.trim()) {
    return sortResults(base, effectiveSort);
  }

  const results = index.search(q.trim());
  let out = results.map((r) => r.item);
  if (category) {
    out = out.filter((t) => t.category.toLowerCase() === category.toLowerCase());
  }
  return sortResults(out, effectiveSort);
}

function sortResults(tools: Tool[], sort: "relevance" | "name" | "category"): Tool[] {
  const out = [...tools];
  if (sort === "name") {
    out.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === "category") {
    out.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }
  return out;
}
