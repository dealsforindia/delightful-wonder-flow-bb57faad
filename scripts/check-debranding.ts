/**
 * De-branding safety net.
 *
 *   bun scripts/check-debranding.ts
 *
 * Runs every wiki page through the real render-time cleaner and fails if any
 * source-identifying string survives. Also scans the tool directory.
 * Run this after every refresh.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const CONTENT_DIR = path.join(process.cwd(), "src/content");
const PAGE_CONTENT = path.join(process.cwd(), "src/lib/page-content.ts");
const DATA_FILE = path.join(process.cwd(), "src/lib/tools-data.server.ts");

const LEAKS: Array<[string, RegExp]> = [
  ["fmhy domain", /https?:\/\/[^\s)"'<>]*fmhy\.[a-z]/i],
  ["fmhy repo", /github\.com\/fmhy/i],
  ["fmhy cdn", /jsdelivr\.net\/gh\/fmhy/i],
  ["rentry mirror", /rentry\.(?:co|org)\/(?:fmhy|ircfmhy)/i],
  ["upstream subreddit", /reddit\.com\/r\/FREEMEDIAHECKYEAH/i],
  ["brand word", /\bFMHY\b/i],
  ["brand word", /freemediaheckyeah/i],
];

async function loadCleaner(): Promise<(md: string) => string> {
  // page-content.ts uses import.meta.glob; pull just the clean() pipeline out
  // by importing it through a tiny shim is overkill — instead re-run the same
  // regexes by evaluating the module's exported helper when available.
  const mod = (await import(PAGE_CONTENT)) as { cleanMarkdown?: (s: string) => string };
  if (!mod.cleanMarkdown) throw new Error("src/lib/page-content.ts must export cleanMarkdown()");
  return mod.cleanMarkdown;
}

async function main() {
  const clean = await loadCleaner();
  const files = (await readdir(CONTENT_DIR)).filter((f) => f.endsWith(".md"));
  let failures = 0;

  for (const f of files) {
    const rendered = clean(await readFile(path.join(CONTENT_DIR, f), "utf8"));
    for (const [label, re] of LEAKS) {
      const m = rendered.match(re);
      if (m) {
        failures++;
        console.error(`LEAK  ${f}  [${label}]  ${JSON.stringify(m[0].slice(0, 120))}`);
      }
    }
  }

  const data = await readFile(DATA_FILE, "utf8");
  for (const [label, re] of LEAKS) {
    const m = data.match(re);
    if (m) {
      failures++;
      console.error(`LEAK  tools-data.server.ts  [${label}]  ${JSON.stringify(m[0].slice(0, 120))}`);
    }
  }

  if (failures) {
    console.error(`\n${failures} leak(s) found.`);
    process.exit(1);
  }
  console.log(`Clean: ${files.length} pages + tool directory, no source fingerprints.`);
}

main();
