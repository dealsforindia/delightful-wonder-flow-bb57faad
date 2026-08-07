/**
 * One-command content refresh.
 *
 *   bun scripts/refresh-content.ts
 *
 * - Pulls every upstream wiki markdown file into src/content/*.md (raw, untouched).
 * - Regenerates src/lib/tools-data.server.ts from the SAME fetch, so the wiki
 *   pages and the browse directory can never drift apart.
 * - Drops source-identifying entries (mirrors, the upstream subreddit, repo links).
 * - Prints a per-page added/removed summary.
 *
 * De-branding stays a render-time transform in src/lib/page-content.ts, so a
 * refresh never re-leaks the source into the UI.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const RAW = "https://raw.githubusercontent.com/fmhy/edit/main/docs";
const CONTENT_DIR = path.join(process.cwd(), "src/content");
const DATA_FILE = path.join(process.cwd(), "src/lib/tools-data.server.ts");

/** upstream path -> local slug. `backups` is deliberately absent. */
const PAGES: Record<string, string> = {
  "ai": "artificial-intelligence",
  "audio": "audio",
  "beginners-guide": "beginners-guide",
  "developer-tools": "developer-tools",
  "downloading": "downloading",
  "educational": "educational",
  "feedback": "feedback",
  "file-tools": "file-tools",
  "gaming": "gaming",
  "gaming-tools": "gaming-tools",
  "image-tools": "image-tools",
  "index": "index",
  "internet-tools": "internet-tools",
  "linux-macos": "linux-macos",
  "misc": "misc",
  "mobile": "mobile",
  "non-english": "non-english",
  "posts": "posts",
  "privacy": "privacy",
  "reading": "reading",
  "sandbox": "sandbox",
  "social-media-tools": "social-media-tools",
  "startpage": "startpage",
  "storage": "storage",
  "system-tools": "system-tools",
  "text-tools": "text-tools",
  "torrenting": "torrenting",
  "unsafe": "unsafe",
  "video": "video",
  "video-tools": "video-tools",
  "other/FAQ": "faq",
  "other/contributing": "contributing",
  "other/selfhosting": "selfhosting",
  "other/wallpapers": "wallpapers",
};

/** local slug -> directory Category (must match src/lib/tools-data.ts). */
const CATEGORY: Record<string, string> = {
  "artificial-intelligence": "AI",
  audio: "Audio",
  "developer-tools": "Code",
  downloading: "Downloads",
  "file-tools": "Files",
  gaming: "Gaming",
  "gaming-tools": "Gaming",
  "beginners-guide": "Guides",
  index: "Guides",
  faq: "Guides",
  contributing: "Guides",
  selfhosting: "Guides",
  posts: "Guides",
  sandbox: "Guides",
  startpage: "Guides",
  feedback: "Guides",
  unsafe: "Guides",
  wallpapers: "Image",
  "image-tools": "Image",
  "internet-tools": "Internet",
  educational: "Learning",
  "linux-macos": "Linux/Mac",
  misc: "Misc",
  mobile: "Mobile",
  "non-english": "Non-English",
  privacy: "Privacy",
  reading: "Reading",
  "social-media-tools": "Social",
  storage: "Storage",
  "system-tools": "System",
  torrenting: "Torrenting",
  video: "Video",
  "video-tools": "Video",
  "text-tools": "Writing",
};

/** Anything that would out the upstream source. Kept broad on purpose. */
export const SOURCE_PATTERN = /fmhy|freemediaheckyeah|rentry\.(?:co|org)\/(?:fmhy|ircfmhy)/i;


const isSourceLink = (url: string) => SOURCE_PATTERN.test(url);
const isSourceName = (name: string) => /fmhy|freemediaheckyeah|back to wiki index/i.test(name);

interface Entry {
  n: string;
  u: string;
  c: string;
  s: string;
  d: string;
  t: string[];
}

/** Everything after the tool link(s) on a wiki line, cleaned into plain prose. */
function lineDescription(line: string): string {
  const flat = line
    .replace(/^[\s*\-+]+/, "")
    .replace(/\[([^\]\n]*)\]\((https?:\/\/[^)\s]+)\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/[\u2b50\u21aa\ufe0f\u{1f300}-\u{1faff}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const dash = flat.indexOf(" - ");
  let rest = dash >= 0 ? flat.slice(dash + 3) : flat.replace(/^[^/]*\//, "");
  if (rest === flat) rest = "";

  const parts = rest
    .split("/")
    .map((p) => p.trim())
    .filter(
      (p) =>
        p.length > 1 &&
        !SOURCE_PATTERN.test(p) &&
        !/^(github|gitlab|discord|subreddit|r\/|telegram|source code|mirror)/i.test(p),
    );

  return parts.join(" / ").slice(0, 180).trim();
}

function lineTags(line: string, description: string): string[] {
  const tags: string[] = [];
  const hay = `${line} ${description}`.toLowerCase();
  if (line.includes("\u2b50")) tags.push("recommended");
  if (/github\.com|gitlab\.|codeberg\.org|open.?source/i.test(line)) tags.push("open source");
  if (/self.?host/i.test(hay)) tags.push("self-hostable");
  if (/sign.?up|login required|account required|phone #|register/i.test(hay)) tags.push("signup");
  if (/paid|premium|subscription|free trial|freemium/i.test(hay)) tags.push("paid");
  for (const [re, tag] of [
    [/windows/i, "windows"],
    [/macos/i, "macos"],
    [/linux/i, "linux"],
    [/android/i, "android"],
    [/\bios\b/i, "ios"],
  ] as Array<[RegExp, string]>) {
    if (re.test(hay)) tags.push(tag);
  }
  return Array.from(new Set(tags)).slice(0, 8);
}

function parseTools(md: string, category: string): Entry[] {
  const out: Entry[] = [];
  let section = "General";
  for (const line of md.split("\n")) {
    const h = line.match(/^#{1,6}\s+(.+?)\s*$/);
    if (h) {
      section = h[1]
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/[*_`]/g, "")
        .trim();
      continue;
    }
    const description = lineDescription(line);
    const tags = lineTags(line, description);
    const re = /\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line))) {
      const name = m[1].replace(/[*_`]/g, "").trim();
      const url = m[2];
      if (!name || isSourceName(name) || isSourceLink(url)) continue;
      out.push({ n: name, u: url, c: category, s: section, d: description, t: tags });
    }
  }
  return out;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

async function main() {
  if (!existsSync(CONTENT_DIR)) await mkdir(CONTENT_DIR, { recursive: true });

  const all: Entry[] = [];
  let totalAdded = 0;
  let totalRemoved = 0;
  const rows: string[] = [];

  for (const [upstream, slug] of Object.entries(PAGES)) {
    const res = await fetch(`${RAW}/${upstream}.md`);
    if (!res.ok) {
      console.error(`  !! ${upstream}: HTTP ${res.status} — kept local copy`);
      continue;
    }
    const next = await res.text();
    const file = path.join(CONTENT_DIR, `${slug}.md`);
    const prev = existsSync(file) ? await readFile(file, "utf8") : "";

    if (prev !== next) {
      const prevLines = new Set(prev.split("\n"));
      const nextLines = new Set(next.split("\n"));
      const added = [...nextLines].filter((l) => l.trim() && !prevLines.has(l)).length;
      const removed = [...prevLines].filter((l) => l.trim() && !nextLines.has(l)).length;
      totalAdded += added;
      totalRemoved += removed;
      rows.push(`  ${slug.padEnd(24)} +${added} / -${removed}`);
      await writeFile(file, next);
    }

    all.push(...parseTools(next, CATEGORY[slug] ?? "Misc"));
  }

  // dedupe by url+name so cross-linked entries don't double up
  const seen = new Set<string>();
  const tools = all.filter((t) => {
    const k = `${t.n}|${t.u}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const body = tools
    .map(
      (t) =>
        `  { n:"${esc(t.n)}", u:"${esc(t.u)}", c:"${esc(t.c)}", s:"${esc(t.s)}", d:"${esc(t.d)}", t:[${t.t.map((x) => `"${esc(x)}"`).join(",")}] },`,
    )
    .join("\n");

  await writeFile(
    DATA_FILE,
    `import type { Tool, Category } from "./tools-data";\nexport const TOOLS: Tool[] = ([\n${body}\n] as const).map((t) => ({ name: t.n, url: t.u, category: t.c as Category, section: t.s, description: t.d, tags: [...t.t] }));\n`,
  );

  console.log(rows.length ? "Changed pages:" : "All pages already current.");
  for (const r of rows) console.log(r);
  console.log(`\nTotal: +${totalAdded} / -${totalRemoved} lines across ${rows.length} page(s)`);
  console.log(`Directory rebuilt: ${tools.length} tools`);
}

main();
