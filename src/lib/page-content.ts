// Eager-import every mirrored FMHY markdown page as a raw string.
// Vite resolves this at build time; no runtime fetch.
const raw = import.meta.glob("../content/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

const MAP: Record<string, string> = {};
for (const [path, content] of Object.entries(raw)) {
  const slug = path.split("/").pop()!.replace(/\.md$/, "");
  MAP[slug] = content;
}

// Strip VitePress frontmatter + <script setup> blocks + custom container directives.
function clean(md: string): string {
  let out = md;
  // frontmatter
  out = out.replace(/^---\n[\s\S]*?\n---\n?/, "");
  // <script setup> blocks
  out = out.replace(/<script[\s\S]*?<\/script>/g, "");
  // <style> blocks
  out = out.replace(/<style[\s\S]*?<\/style>/g, "");
  // VitePress containers ::: warning ... ::: -> blockquote style
  out = out.replace(/^:::\s*(warning|tip|info|danger|details)([^\n]*)\n([\s\S]*?)^:::\s*$/gm, (_m, kind, _title, body) => {
    const label = String(kind).toUpperCase();
    return `\n> **${label}**\n>\n${body.split("\n").map((l: string) => "> " + l).join("\n")}\n`;
  });
  // Badge components <Badge type="tip" text="..." /> -> `text`
  out = out.replace(/<Badge[^>]*text=["']([^"']+)["'][^>]*\/?\s*>/g, "`$1`");
  return out;
}

export function getPageMarkdown(slug: string): string | null {
  const raw = MAP[slug];
  if (!raw) return null;
  return clean(raw);
}

export function hasPage(slug: string): boolean {
  return slug in MAP;
}
