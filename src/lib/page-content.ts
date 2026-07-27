// Eager-import every mirrored markdown page as a raw string.
// Vite resolves this at build time; no runtime fetch.
const raw = import.meta.glob("../content/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

const RAW_MAP: Record<string, string> = {};
for (const [path, content] of Object.entries(raw)) {
  const slug = path.split("/").pop()!.replace(/\.md$/, "");
  // Skip the branded backups page entirely — nothing about the source.
  if (slug === "backups") continue;
  RAW_MAP[slug] = content;
}

// ── source-identifying links get flattened to plain text ─────────────
const SOURCE_HOST = /^https?:\/\/(?:[^)\s]*\.)?(?:fmhy\.(?:net|pages\.dev|xyz|lol|si|vercel\.app)|rentry\.co\/FMHY|rentry\.org\/FMHY|reddit\.com\/r\/FREEMEDIAHECKYEAH|github\.com\/fmhy)/i;

// ── section-index across all pages so we can inline "link-only" headings
function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function decodeRedditAnchor(a: string): string {
  // Reddit encodes non-alphanumerics as .XX (hex of unicode codepoint low bytes).
  return a
    .replace(/^wiki_/, "")
    .replace(/\.([0-9a-f]{2,4})/gi, (_m, hex) => {
      try { return String.fromCodePoint(parseInt(hex, 16)); } catch { return " "; }
    });
}

interface Section { key: string; level: number; body: string; }

function indexSections(md: string): Record<string, Section> {
  const lines = md.split("\n");
  const secs: Record<string, Section> = {};
  let cur: { key: string; level: number; body: string[] } | null = null;
  const flush = () => { if (cur) secs[cur.key] = { key: cur.key, level: cur.level, body: cur.body.join("\n").trim() }; };
  for (const line of lines) {
    const m = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (m) {
      flush();
      cur = { key: normalizeKey(m[2]), level: m[1].length, body: [] };
    } else if (cur) {
      cur.body.push(line);
    }
  }
  flush();
  return secs;
}

const SECTION_INDEX: Record<string, Record<string, Section>> = {};
for (const [slug, md] of Object.entries(RAW_MAP)) {
  SECTION_INDEX[slug] = indexSections(md);
}

// aliases for pages whose reddit slug differs from ours
const SLUG_ALIAS: Record<string, string> = {
  edu: "educational",
  games: "gaming",
  storage: "storage",
  linux: "linux-macos",
  torrent: "torrenting",
  "android-ios": "mobile",
  ai: "artificial-intelligence",
  "text-tools": "text-tools",
  "system-tools": "system-tools",
  "internet-tools": "internet-tools",
  "adblock-vpn-privacy": "privacy",
  "beginners-guide": "beginners-guide",
};

// ── the main clean/transform pipeline ────────────────────────────────
function clean(md: string): string {
  let out = md;

  // frontmatter
  out = out.replace(/^---\n[\s\S]*?\n---\n?/, "");
  // <script setup> / <style> blocks
  out = out.replace(/<script[\s\S]*?<\/script>/g, "");
  out = out.replace(/<style[\s\S]*?<\/style>/g, "");
  // VitePress containers ::: warning ...
  out = out.replace(/^:::\s*(warning|tip|info|danger|details)([^\n]*)\n([\s\S]*?)^:::\s*$/gm, (_m, kind, _title, body) => {
    const label = String(kind).toUpperCase();
    return `\n> **${label}**\n>\n${body.split("\n").map((l: string) => "> " + l).join("\n")}\n`;
  });
  // Badge components
  out = out.replace(/<Badge[^>]*text=["']([^"']+)["'][^>]*\/?\s*>/g, "`$1`");
  // "Back to Wiki Index" nav crumbs
  out = out.replace(/\*\*\[◄◄ Back to [^\]]+\]\([^)]+\)\*\*/g, "");

  // Expand link-only section headers: `## ▷ [Video Sites](https://reddit.com/r/FREE.../wiki/video#wiki_.25BA_download_sites)`
  out = out.replace(
    /^(#{2,6})\s+([►▷▶]\s+)?\[([^\]]+)\]\((https?:\/\/(?:www\.|old\.)?reddit\.com\/r\/FREEMEDIAHECKYEAH\/wiki\/([^)#\s]+)(?:#([^)\s]+))?)\)\s*$/gim,
    (_m, hashes, marker, text, _url, targetSlugRaw, anchor) => {
      const targetSlug = SLUG_ALIAS[targetSlugRaw.replace(/\/$/, "")] ?? targetSlugRaw.replace(/\/$/, "");
      const plain = `${hashes} ${marker || ""}${text}`;
      if (!anchor) return plain;
      const key = normalizeKey(decodeRedditAnchor(anchor));
      const secs = SECTION_INDEX[targetSlug];
      if (!secs) return plain;
      const target = secs[key];
      if (!target || !target.body) return plain;
      // strip nested source-only links inside the pulled body too (recursion not needed —
      // the global link-flatten pass below handles it)
      return `${plain}\n\n${target.body}`;
    },
  );

  // Flatten source-identifying links to plain text everywhere
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (m, text, url) => {
    if (SOURCE_HOST.test(url)) return text;
    return m;
  });

  // Words: don't out the source
  out = out.replace(/\bFreeMediaHeckYeah\b/g, "Unlocked");
  out = out.replace(/\br\/FREEMEDIAHECKYEAH\b/gi, "Unlocked");
  out = out.replace(/\bFMHY\b/g, "Unlocked");

  return out;
}

export function getPageMarkdown(slug: string): string | null {
  const raw = RAW_MAP[slug];
  if (!raw) return null;
  return clean(raw);
}

export function hasPage(slug: string): boolean {
  return slug in RAW_MAP;
}
