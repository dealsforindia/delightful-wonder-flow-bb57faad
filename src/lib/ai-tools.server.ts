import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { TOOLS } from "./tools-data.server";
import type { Tool } from "./tools-data";

const KEYWORD_MODEL = "google/gemini-3.1-flash-lite";
const RANKING_MODEL = "google/gemini-3.6-flash";
const PLANNING_MODEL = "google/gemini-3.6-flash";

function safeJsonParse<T>(text: string, fallback: T): T {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const m = cleaned.match(/\{[\s\S]*\}/) ?? cleaned.match(/\[[\s\S]*\]/);
  try {
    return JSON.parse(m ? m[0] : cleaned) as T;
  } catch {
    return fallback;
  }
}

// Lightweight fuzzy prefilter — with 26k tools we can't ship the whole index
// to the LLM every call. Score & keep top candidates, then let AI rank.
export function prefilter(query: string, refine: string | undefined, k = 500): number[] {
  const q = (query + " " + (refine ?? "")).toLowerCase();
  const terms = q.split(/[\s,./;]+/).filter((t) => t.length > 2);
  const scored: Array<{ i: number; s: number }> = [];
  for (let i = 0; i < TOOLS.length; i++) {
    const t = TOOLS[i];
    const hay = (t.name + " " + t.section + " " + t.category).toLowerCase();
    let s = 0;
    for (const term of terms) {
      const idx = hay.indexOf(term);
      if (idx >= 0) s += 100 - Math.min(idx, 80) + (t.name.toLowerCase().includes(term) ? 50 : 0);
    }
    if (s > 0) scored.push({ i, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, k).map((p) => p.i);
}


export function scoreTools(query: string, k: number): number[] {
  const terms = query.toLowerCase().split(/[\s,./;]+/).filter((t) => t.length > 2);
  if (terms.length === 0) return [];
  const scored: Array<{ i: number; s: number }> = [];
  for (let i = 0; i < TOOLS.length; i++) {
    const t = TOOLS[i];
    const hay = (t.name + " " + t.section + " " + t.category).toLowerCase();
    let s = 0;
    for (const term of terms) {
      const idx = hay.indexOf(term);
      if (idx >= 0) s += 100 - Math.min(idx, 80) + (t.name.toLowerCase().includes(term) ? 40 : 0);
    }
    if (s > 0) scored.push({ i, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, k).map((p) => p.i);
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
  const index = ids
    .map((i) => `${i}|${TOOLS[i].name}|${TOOLS[i].section}|${TOOLS[i].category}`)
    .join("\n");
  const prior = previousIds?.length
    ? `\nPREVIOUS RESULTS (already shown, prefer different picks unless still best): ${previousIds.join(",")}`
    : "";
  const refineBlock = refine ? `\nUSER REFINEMENT: ${refine}` : "";

  const system = `You are a search engine over a curated directory of ${TOOLS.length} free tools from FMHY.
Each line: INDEX|NAME|SECTION|CATEGORY.
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
  const merged = new Set<number>(scoreTools(goal, 200));
  for (const kw of perKeyword) {
    for (const id of scoreTools(kw.join(" "), 40)) merged.add(id);
  }
  const finalIds = Array.from(merged);


  const index = finalIds
    .map((i) => `${i}|${TOOLS[i].name}|${TOOLS[i].category}|${TOOLS[i].section}`)
    .join("\n");

  const system = `You are a resourceful strategist. Given a real-world GOAL, design a 3-6 step roadmap using ONLY the free tools in the CANDIDATES list (referenced by INDEX number).
Each step: a concrete action, one tool, a rationale, and an estimated time.
Chain tools cleverly across distinct sub-tasks; do not repeat the same tool.

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
      temperature: 0.7,
    });
    parsed = result.experimental_output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      parsed = safeJsonParse<z.infer<typeof RoadmapSchema>>(error.text ?? "", { title: null, steps: [] });
    }
  }

  const steps = (parsed.steps ?? [])
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

  const index = pool.map((i) => `${i}|${TOOLS[i].name}|${TOOLS[i].category}|${TOOLS[i].section}`).join("\n");
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
      temperature: 0.6,
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
