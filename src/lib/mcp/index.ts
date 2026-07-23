import { defineMcp } from "@lovable.dev/mcp-js";
import searchTools from "./tools/search-tools";
import listCategories from "./tools/list-categories";
import browseCategory from "./tools/browse-category";

export default defineMcp({
  name: "fmhy-palette-mcp",
  title: "FMHY Palette",
  version: "0.1.0",
  instructions:
    "Access a curated directory of 26,000+ free tools from FreeMediaHeckYeah (FMHY). Use `search_tools` for keyword or fuzzy search, `list_categories` to see the taxonomy, and `browse_category` to enumerate tools in a category or section.",
  tools: [searchTools, listCategories, browseCategory],
});
