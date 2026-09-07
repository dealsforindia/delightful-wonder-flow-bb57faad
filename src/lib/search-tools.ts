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

// Compare names by their first real letter/digit so ".onion", ":)", "4K-…"
// etc. don't cluster at the top of alphabetical lists.
const sortKey = (name: string) => {
  const m = name.match(/[a-z0-9]/i);
  return (m ? name.slice(m.index).toLowerCase() : name.toLowerCase());
};
const isRecommended = (t: Tool) => t.tags.includes("recommended");
const byName = (a: Tool, b: Tool) =>
  sortKey(a.name).localeCompare(sortKey(b.name)) || a.name.localeCompare(b.name);

function sortResults(tools: Tool[], sort: "relevance" | "name" | "category"): Tool[] {
  const out = [...tools];
  if (sort === "name") {
    // Default no-query view: recommended entries first, then alphabetical.
    out.sort((a, b) => Number(isRecommended(b)) - Number(isRecommended(a)) || byName(a, b));
  } else if (sort === "category") {
    out.sort((a, b) => a.category.localeCompare(b.category) || byName(a, b));
  }
  return out;
}
