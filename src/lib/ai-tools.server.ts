import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { TOOLS } from "./tools-data.server";
import type { Category, Tool } from "./tools-data";

const KEYWORD_MODEL = "google/gemini-2.5-flash";
const RANKING_MODEL = "google/gemini-2.5-flash";
const PLANNING_MODEL = "google/gemini-2.5-flash";

function safeJsonParse<T>(text: string, fallback: T): T {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const m = cleaned.match(/\{[\s\S]*\}/) ?? cleaned.match(/\[[\s\S]*\]/);
  try {
    return JSON.parse(m ? m[0] : cleaned) as T;
  } catch {
    return fallback;
  }
}

/** One candidate line for the LLM: index, name, taxonomy, blurb and markers. */
function indexLine(i: number): string {
  const t = TOOLS[i];
  const desc = (t.description ?? "").slice(0, 140);
  const tags = (t.tags ?? []).join(",");
  return [i, t.name, t.section, t.category, desc, tags].join("|");
}

/**
 * Intent map — broad, vague goals ("make money", "start a podcast") share almost
 * no literal words with directory entries, so plain keyword matching returns junk.
 * Each rule adds concrete search terms and boosts the categories that actually
 * hold the relevant tools.
 */
interface IntentRule {
  match: RegExp;
  terms: string[];
  categories: Category[];
}

const INTENT_MAP: IntentRule[] = [
  {
    match: /\b(make|earn|passive)\s+(money|income|cash)\b|\bmonetiz|\bside hustle\b|\bfreelanc/i,
    terms: ["freelance", "invoice", "portfolio", "store", "payment", "marketing", "seo", "stock"],
    categories: ["AI", "Writing", "Image", "Internet", "Learning"],
  },
  {
    match: /\b(job|resume|cv|cover letter|interview|career|hire)\b/i,
    terms: ["resume", "cv", "portfolio", "interview", "course", "certificate", "writing"],
    categories: ["Writing", "Learning", "AI"],
  },
  {
    match: /\b(study|learn|course|exam|school|college|homework|research)\b/i,
    terms: ["course", "textbook", "notes", "flashcard", "lecture", "paper", "language"],
    categories: ["Learning", "Reading", "AI"],
  },
  {
    match: /\b(youtube|video|film|edit(ing)?|vlog|short(s)?|reel)\b/i,
    terms: ["video editor", "screen record", "subtitle", "thumbnail", "stock footage", "converter"],
    categories: ["Video", "Image", "Audio", "Downloads"],
  },
  {
    match: /\b(podcast|music|song|beat|audio|voice|record)\b/i,
    terms: ["audio editor", "daw", "text to speech", "noise removal", "sound effects", "hosting"],
    categories: ["Audio", "AI", "Downloads"],
  },
  {
    match: /\b(privacy|anonym|track(ing|er)?|secure|vpn|encrypt)\b/i,
    terms: ["vpn", "encryption", "password manager", "adblock", "browser", "email alias"],
    categories: ["Privacy", "Internet", "System"],
  },
  {
    match: /\b(code|coding|develop|programming|app|website|api|deploy)\b/i,
    terms: ["ide", "hosting", "api", "database", "editor", "framework", "learn programming"],
    categories: ["Code", "Learning", "AI"],
  },
  {
    match: /\b(design|logo|brand|poster|thumbnail|graphic|photo|image)\b/i,
    terms: ["design", "logo maker", "photo editor", "icons", "fonts", "mockup", "stock photos"],
    categories: ["Image", "AI", "Files"],
  },
  {
    match: /\b(social|instagram|tiktok|twitter|content creat|audience|followers)\b/i,
    terms: ["scheduler", "analytics", "downloader", "caption", "thumbnail", "video editor"],
    categories: ["Social", "Video", "Image", "AI"],
  },
  {
    match: /\b(write|writing|blog|book|novel|newsletter|essay|note)\b/i,
    terms: ["writing", "grammar", "notes", "markdown", "publishing", "proofread"],
    categories: ["Writing", "Reading", "AI"],
  },
  {
    match: /\b(game|gaming|emulat|mod)\b/i,
    terms: ["emulator", "game", "mods", "launcher", "controller"],
    categories: ["Gaming", "Downloads"],
  },
  {
    match: /\b(backup|storage|file|sync|share|transfer|cloud)\b/i,
    terms: ["cloud storage", "file transfer", "backup", "sync", "compression"],
    categories: ["Storage", "Files", "System"],
  },
  {
    match: /\b(movie|tv|show|anime|stream|watch|series)\b/i,
    terms: ["streaming", "anime", "movies", "tv", "subtitles", "player"],
    categories: ["Video", "Downloads", "Non-English"],
  },
  {
    match: /\b(download|torrent|seed|magnet|usenet|piracy|free copy)\b/i,
    terms: ["torrent", "download manager", "usenet", "tracker", "direct download", "debrid"],
    categories: ["Torrenting", "Downloads", "Files"],
  },
  {
    match: /\b(read|book|ebook|manga|comic|news|magazine|pdf)\b/i,
    terms: ["ebook", "manga", "comics", "pdf reader", "audiobook", "news"],
    categories: ["Reading", "Files", "Learning"],
  },
  {
    match: /\b(android|ios|iphone|phone|mobile|apk|tablet)\b/i,
    terms: ["android", "ios", "apk", "mobile app", "sideload", "emulator"],
    categories: ["Mobile", "Downloads", "System"],
  },
  {
    match: /\b(linux|ubuntu|mac|macos|distro|terminal|shell)\b/i,
    terms: ["linux", "macos", "terminal", "package manager", "distro", "shell"],
    categories: ["Linux/Mac", "System", "Code"],
  },
  {
    match: /\b(windows|pc|driver|clean|speed up|debloat|optimi[sz]e|malware|antivirus|iso)\b/i,
    terms: ["windows", "drivers", "debloat", "antivirus", "iso", "cleanup", "benchmark"],
    categories: ["System", "Privacy", "Downloads"],
  },
  {
    match: /\b(ai|chatbot|llm|gpt|prompt|generate|automat)\b/i,
    terms: ["chatbot", "llm", "image generation", "transcription", "prompt", "api"],
    categories: ["AI", "Code", "Writing"],
  },
  {
    match: /\b(pdf|convert|compress|ocr|scan|spreadsheet|document)\b/i,
    terms: ["pdf tools", "converter", "compress", "ocr", "office", "document"],
    categories: ["Files", "Internet", "Writing"],
  },
  {
    match: /\b(search|browser|extension|rss|bookmark|email|internet)\b/i,
    terms: ["search engine", "browser extension", "rss reader", "bookmarks", "email", "startpage"],
    categories: ["Internet", "Privacy", "Social"],
  },
  {
    match: /\b(spanish|hindi|chinese|japanese|korean|arabic|russian|non-?english|translat)\b/i,
    terms: ["translation", "language", "subtitles", "regional", "dictionary"],
    categories: ["Non-English", "Learning", "Reading"],
  },
  {
    match: /\b(host|self-?host|server|vps|docker|domain|deploy)\b/i,
    terms: ["self-hosted", "hosting", "server", "docker", "domain", "vps"],
    categories: ["Code", "Storage", "Internet"],
  },
  {
    match: /\b(wallpaper|theme|customi[sz]e|rice|icon pack|font)\b/i,
    terms: ["wallpapers", "themes", "icons", "fonts", "customization"],
    categories: ["Image", "System", "Misc"],
  },
];


/** Terms + boosted categories derived from a vague intent. */
export function expandIntent(query: string): { terms: string[]; categories: Set<string> } {
  const terms = new Set<string>();
  const categories = new Set<string>();
  for (const rule of INTENT_MAP) {
    if (rule.match.test(query)) {
      for (const t of rule.terms) terms.add(t.toLowerCase());
      for (const c of rule.categories) categories.add(c.toLowerCase());
    }
  }
  return { terms: Array.from(terms), categories };
}

function rankByTerms(
  terms: string[],
  boostCategories: Set<string>,
  nameBoost: number,
  k: number,
): number[] {
  const scored: Array<{ i: number; s: number }> = [];
  for (let i = 0; i < TOOLS.length; i++) {
    const t = TOOLS[i];
    const hay = (t.name + " " + t.section + " " + t.category + " " + (t.description ?? "")).toLowerCase();
    let s = 0;
    for (const term of terms) {
      const idx = hay.indexOf(term);
      if (idx >= 0) s += 100 - Math.min(idx, 80) + (t.name.toLowerCase().includes(term) ? nameBoost : 0);
    }
    if (s > 0 && boostCategories.has(t.category.toLowerCase())) s = Math.round(s * 1.6);
    if (s > 0) scored.push({ i, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, k).map((p) => p.i);
}

// Lightweight fuzzy prefilter — with 26k tools we can't ship the whole index
// to the LLM every call. Score & keep top candidates, then let AI rank.
export function prefilter(query: string, refine: string | undefined, k = 500): number[] {
  const q = (query + " " + (refine ?? "")).toLowerCase();
  const literal = q.split(/[\s,./;]+/).filter((t) => t.length > 2);
  const intent = expandIntent(q);
  const terms = Array.from(new Set([...literal, ...intent.terms]));
  return rankByTerms(terms, intent.categories, 50, k);
}


export function scoreTools(query: string, k: number): number[] {
  const q = query.toLowerCase();
  const literal = q.split(/[\s,./;]+/).filter((t) => t.length > 2);
  const intent = expandIntent(q);
  const terms = Array.from(new Set([...literal, ...intent.terms]));
  if (terms.length === 0) return [];
  return rankByTerms(terms, intent.categories, 40, k);
}


export async function expandKeywords(apiKey: string, goal: string): Promise<string[]> {
  const gateway = createLovableAiGatewayProvider(apiKey);
  const model = gateway(KEYWORD_MODEL);
  try {
    const result = await generateText({
      model,
      system:
        'Break the user goal into 3-7 short workflow keywords, each 1-3 words, covering distinct sub-tasks needed end-to-end. Reply with JSON only: {"keywords":["...","..."]}. No prose.',
      prompt: goal,
      experimental_output: Output.object({
        schema: z.object({ keywords: z.array(z.string()) }),
      }),
      temperature: 0.3,
    });
    return result.experimental_output.keywords.map((k) => String(k).toLowerCase()).filter(Boolean).slice(0, 8);
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      const parsed = safeJsonParse<{ keywords?: string[] }>(error.text ?? "", {});
      if (Array.isArray(parsed.keywords)) {
        return parsed.keywords.map((k) => String(k).toLowerCase()).filter(Boolean).slice(0, 8);
      }
    }
    return goal.toLowerCase().split(/[\s,./;]+/).filter((t) => t.length > 2).slice(0, 8);
  }
}

const RankSchema = z.object({
  results: z.array(
    z.object({
      i: z.number(),
      why: z.string(),
    }),
  ),
});

export async function rankTools(
  query: string,
  refine: string | undefined,
  limit: number,
  previousIds: number[] | undefined,
  apiKey: string,
): Promise<Array<{ i: number; tool: Tool; why: string }>> {
  const ids = prefilter(query, refine, 500);
  const index = ids.map(indexLine).join("\n");
  const prior = previousIds?.length
    ? `\nPREVIOUS RESULTS (already shown, prefer different picks unless still best): ${previousIds.join(",")}`
    : "";
  const refineBlock = refine ? `\nUSER REFINEMENT: ${refine}` : "";

  const system = `You are a search engine over a curated directory of ${TOOLS.length} free tools from FMHY.
Each line: INDEX|NAME|SECTION|CATEGORY|DESCRIPTION|TAGS (tags may include recommended, open source, self-hostable, signup, paid, and platforms).\nUse the description and tags — prefer tools whose description actually matches the intent, and mention a signup or paid requirement in the reason when the tags say so.
Given a user intent, return the ${limit} MOST RELEVANT tools ranked best-first as a JSON object: {"results":[{"i":INDEX,"why":"short reason"}]}. No prose, no markdown.`;

  const user = `INTENT: ${query}${refineBlock}${prior}\n\nCANDIDATES:\n${index}`;

  const gateway = createLovableAiGatewayProvider(apiKey);
  const model = gateway(RANKING_MODEL);

  let parsed: z.infer<typeof RankSchema> = { results: [] };
  try {
    const result = await generateText({
      model,
      system,
      prompt: user,
      experimental_output: Output.object({ schema: RankSchema }),
      temperature: 0.2,
    });
    parsed = result.experimental_output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      const raw = safeJsonParse<z.infer<typeof RankSchema> | Array<{ i: number; why?: string }>>(
        error.text ?? "",
        { results: [] },
      );
      parsed = Array.isArray(raw)
        ? { results: raw.map((r) => ({ i: r.i, why: r.why ?? "" })) }
        : raw;
    }
  }

  const chosen = parsed.results
    .filter((r) => Number.isInteger(r.i) && r.i >= 0 && r.i < TOOLS.length)
    .slice(0, limit);

  if (chosen.length === 0) {
    // Fallback to fuzzy prefilter so the user never sees a blank result.
    return ids.slice(0, limit).map((i) => ({ i, tool: TOOLS[i], why: "Top fuzzy match" }));
  }

  return chosen.map((r) => ({ i: r.i, tool: TOOLS[r.i], why: String(r.why ?? "").slice(0, 120) }));
}

const RoadmapSchema = z.object({
  title: z.string().nullable(),
  steps: z.array(
    z.object({
      i: z.number(),
      action: z.string().nullable(),
      why: z.string().nullable(),
      output: z.string().nullable(),
      estMinutes: z.number().nullable(),
    }),
  ).nullable(),
});

export interface RoadmapStep {
  i: number;
  name: string;
  url: string;
  category: string;
  section: string;
  action: string;
  output: string;
  why: string;
  estMinutes: number;
}

export interface RoadmapResult {
  goal: string;
  title: string;
  totalMinutes: number;
  keywords: string[];
  steps: RoadmapStep[];
}

export async function buildRoadmap(
  goal: string,
  apiKey: string,
  options?: {
    refine?: string;
    previous?: {
      title: string;
      steps: Array<{ i: number; action: string; output: string; why?: string; estMinutes?: number }>;
    };
  },
): Promise<RoadmapResult> {
  const keywords = await expandKeywords(apiKey, goal);
  const perKeyword = keywords.map((k) => k.split(/\s+/).filter(Boolean));
  const merged = new Set<number>(scoreTools(goal, 300));
  for (const kw of perKeyword) {
    for (const id of scoreTools(kw.join(" "), 80)) merged.add(id);
  }
  let finalIds = Array.from(merged);

  // If fuzzy matching is too sparse, pull a wider ranked net from the LLM.
  if (finalIds.length < 20) {
    const ranked = await rankTools(goal, options?.refine ?? undefined, 60, undefined, apiKey);
    for (const r of ranked) merged.add(r.i);
    finalIds = Array.from(merged);
  }

  const index = finalIds.map(indexLine).join("\n");

  const system = `You are a pragmatic expert who builds real, working roadmaps. Given a GOAL, design a 3-6 step plan using ONLY tools from CANDIDATES (referenced by INDEX).

Rules:
- Every step must be genuinely necessary to reach the GOAL. No filler, no tangential tools.
- Pick the tool that best fits each step. If no candidate truly fits a step, skip that step rather than force an unrelated tool.
- Steps must be sequential and actionable — each output feeds the next.
- Do not repeat the same tool. Do not pad the plan.
- Use each candidate's DESCRIPTION and TAGS to judge fit. If a tool is tagged signup or paid, say so in 'why'.
- 'action' is a concrete instruction the user can follow. 'output' is what they'll have after. 'why' explains the tool choice in one line.

Reply ONLY with JSON matching the schema. No prose, no markdown fences.`;


  const priorBlock = options?.previous
    ? `\n\nPREVIOUS PLAN (revise it, don't rebuild from scratch unless needed):\n${JSON.stringify(options.previous)}`
    : "";
  const refineBlock = options?.refine ? `\n\nUSER REFINEMENT: ${options.refine}` : "";
  const kwBlock = keywords.length ? `\nWORKFLOW KEYWORDS: ${keywords.join(", ")}` : "";
  const user = `GOAL: ${goal}${kwBlock}${refineBlock}${priorBlock}\n\nCANDIDATES (${finalIds.length} of ${TOOLS.length}):\n${index}`;

  const gateway = createLovableAiGatewayProvider(apiKey);
  const model = gateway(PLANNING_MODEL);

  let parsed: z.infer<typeof RoadmapSchema> = { title: null, steps: [] };
  try {
    const result = await generateText({
      model,
      system,
      prompt: user,
      experimental_output: Output.object({ schema: RoadmapSchema }),
      temperature: 0.2,
    });
    parsed = result.experimental_output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      parsed = safeJsonParse<z.infer<typeof RoadmapSchema>>(error.text ?? "", { title: null, steps: [] });
    }
  }

  let steps = (parsed.steps ?? [])
    .filter((s) => Number.isInteger(s.i) && s.i >= 0 && s.i < TOOLS.length)
    .slice(0, 6)
    .map((s) => {
      const t = TOOLS[s.i];
      return {
        i: s.i,
        name: t.name,
        url: t.url,
        category: t.category,
        section: t.section,
        action: String(s.action ?? "Use this tool").slice(0, 220),
        output: String(s.output ?? "a completed task").slice(0, 100),
        why: String(s.why ?? "A good fit for this step").slice(0, 140),
        estMinutes: Math.max(5, Math.min(240, Math.round(Number(s.estMinutes ?? 20)))),
      };
    });

  // Fallback: if the AI couldn't compose a chain, build one from the best ranked matches.
  if (steps.length === 0 && finalIds.length > 0) {
    const ranked = await rankTools(goal, options?.refine ?? undefined, 6, undefined, apiKey);
    steps = ranked.slice(0, 6).map((r, idx) => {
      const t = r.tool;
      return {
        i: r.i,
        name: t.name,
        url: t.url,
        category: t.category,
        section: t.section,
        action: `Use ${t.name} for the "${goal}" workflow — ${t.section}.`,
        output: `Completed work with ${t.name}`,
        why: r.why,
        estMinutes: 20 + idx * 10,
      };
    });
  }

  return {
    goal,
    title: String(parsed.title ?? "Your roadmap").slice(0, 80),
    keywords,
    totalMinutes: steps.reduce((n, s) => n + s.estMinutes, 0),
    steps,
  };
}

const SwapSchema = z.object({
  i: z.number().nullable(),
  why: z.string().nullable(),
});

export interface SwapInput {
  goal: string;
  stepAction: string;
  currentToolId: number;
  category: string;
  section: string;
  exclude?: number[];
}

export async function swapStep(
  data: SwapInput,
  apiKey: string,
): Promise<{ i: number; tool: Tool; why: string } | { tool: null }> {
  const catLower = data.category.toLowerCase();
  const secLower = data.section.toLowerCase();
  const goalTerms = data.goal.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const actTerms = data.stepAction.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const excluded = new Set(data.exclude ?? []);
  excluded.add(data.currentToolId);

  const sameBucket: number[] = [];
  for (let i = 0; i < TOOLS.length && sameBucket.length < 60; i++) {
    if (excluded.has(i)) continue;
    const t = TOOLS[i];
    if (t.category.toLowerCase() === catLower || t.section.toLowerCase() === secLower) {
      sameBucket.push(i);
    }
  }
  const scored = scoreTools([...goalTerms, ...actTerms].join(" "), 120).filter((i) => !excluded.has(i));
  const pool = Array.from(new Set([...sameBucket, ...scored])).slice(0, 150);
  if (pool.length === 0) return { tool: null };

  const index = pool.map(indexLine).join("\n");
  const system = `Pick ONE alternative tool for the given step. Reply ONLY as JSON matching the schema. No prose.`;
  const user = `GOAL: ${data.goal}\nSTEP ACTION: ${data.stepAction}\nCURRENT: ${TOOLS[data.currentToolId]?.name}\nEXCLUDE INDEXES: ${Array.from(excluded).join(",")}\n\nCANDIDATES:\n${index}`;

  const gateway = createLovableAiGatewayProvider(apiKey);
  const model = gateway(RANKING_MODEL);

  let parsed: z.infer<typeof SwapSchema> = { i: null, why: null };
  try {
    const result = await generateText({
      model,
      system,
      prompt: user,
      experimental_output: Output.object({ schema: SwapSchema }),
      temperature: 0.2,
    });
    parsed = result.experimental_output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      parsed = safeJsonParse<z.infer<typeof SwapSchema>>(error.text ?? "", { i: null, why: null });
    }
  }

  if (
    typeof parsed.i !== "number" ||
    !Number.isInteger(parsed.i) ||
    parsed.i < 0 ||
    parsed.i >= TOOLS.length ||
    excluded.has(parsed.i)
  ) {
    const fallback = pool[0];
    return { i: fallback, tool: TOOLS[fallback], why: "Similar tool from the same category." };
  }
  return { i: parsed.i, tool: TOOLS[parsed.i], why: String(parsed.why ?? "").slice(0, 100) };
}
