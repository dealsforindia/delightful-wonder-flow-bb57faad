import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TOOLS } from "./tools-data.server";

const GoalSchema = z.object({
  goal: z.string().min(3).max(400),
  refine: z.string().max(300).optional(),
  previous: z
    .object({
      title: z.string().max(120),
      steps: z.array(
        z.object({
          i: z.number().int().nonnegative(),
          action: z.string(),
          output: z.string(),
          why: z.string().optional(),
          estMinutes: z.number().int().optional(),
        }),
      ),
    })
    .optional(),
});

const SwapSchema = z.object({
  goal: z.string().min(3).max(400),
  stepAction: z.string().min(3).max(300),
  currentToolId: z.number().int().nonnegative(),
  category: z.string().max(120),
  section: z.string().max(120),
  exclude: z.array(z.number().int().nonnegative()).max(20).optional(),
});

// -------- retrieval helpers ----------

function scoreAgainst(termsList: string[][], k: number, boostIds?: Set<number>): number[] {
  const scored: Array<{ i: number; s: number }> = [];
  for (let i = 0; i < TOOLS.length; i++) {
    const t = TOOLS[i];
    const hay = (t.name + " " + t.section + " " + t.category).toLowerCase();
    let s = 0;
    for (const terms of termsList) {
      for (const term of terms) {
        if (term.length < 3) continue;
        const idx = hay.indexOf(term);
        if (idx >= 0) s += 20 - Math.min(idx, 18);
      }
    }
    if (boostIds?.has(i)) s += 50;
    if (s > 0) scored.push({ i, s });
  }
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, k).map((p) => p.i);
}

async function expandKeywords(apiKey: string, goal: string): Promise<string[]> {
  // Ask model to expand the goal into 3-8 workflow sub-tasks / keywords.
  // Fall back to naive split on error.
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              'Break the user goal into 3-7 short workflow keywords, each 1-3 words, covering distinct sub-tasks needed end-to-end. Reply with JSON only: {"keywords":["...","..."]}. No prose.',
          },
          { role: "user", content: goal },
        ],
        temperature: 0.3,
      }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = (json.choices?.[0]?.message?.content ?? "{}").replace(/```json|```/g, "").trim();
    const m = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(m ? m[0] : raw) as { keywords?: unknown };
    if (Array.isArray(parsed.keywords)) {
      return parsed.keywords.map((k) => String(k).toLowerCase()).filter(Boolean).slice(0, 8);
    }
  } catch {
    // fall through
  }
  return goal.toLowerCase().split(/[\s,.;/]+/).filter((t) => t.length > 2).slice(0, 8);
}

// -------- main recipe ----------

export const aiRecipe = createServerFn({ method: "POST" })
  .validator((data) => GoalSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const goalTerms = data.goal.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const keywords = await expandKeywords(apiKey, data.goal);
    const perKeyword = keywords.map((k) => k.split(/\s+/).filter(Boolean));
    const ids = scoreAgainst([goalTerms, ...perKeyword], 500);
    // Broaden with a sample so the model can propose non-obvious combos.
    const step = Math.max(1, Math.floor(TOOLS.length / 200));
    const seen = new Set(ids);
    for (let i = 0; i < TOOLS.length && seen.size < 700; i += step) seen.add(i);
    const finalIds = Array.from(seen);

    const index = finalIds
      .map((i) => `${i}|${TOOLS[i].name}|${TOOLS[i].category}|${TOOLS[i].section}`)
      .join("\n");

    const system = `You are a resourceful strategist. Given a real-world GOAL, design a 3-6 step roadmap using ONLY the free tools in the CANDIDATES list (referenced by INDEX number).
Each step: a concrete action, one tool, a rationale, and an estimated time.
Chain tools cleverly across distinct sub-tasks; do not repeat the same tool.

Reply ONLY with JSON (no prose, no markdown fences):
{
  "title": "catchy 3-6 word plan title",
  "totalMinutes": <sum of step estimates>,
  "steps": [
    { "i": <INDEX>, "action": "imperative sentence 10-18 words", "why": "why this tool 8-14 words", "output": "what you have after 4-8 words", "estMinutes": <int 5-120> }
  ]
}`;

    const priorBlock = data.previous
      ? `\n\nPREVIOUS PLAN (revise it, don't rebuild from scratch unless needed):\n${JSON.stringify(data.previous)}`
      : "";
    const refineBlock = data.refine ? `\n\nUSER REFINEMENT: ${data.refine}` : "";
    const kwBlock = keywords.length ? `\nWORKFLOW KEYWORDS: ${keywords.join(", ")}` : "";
    const user = `GOAL: ${data.goal}${kwBlock}${refineBlock}${priorBlock}\n\nCANDIDATES (${finalIds.length} of ${TOOLS.length}):\n${index}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
      }),
    });

    if (!res.ok) throw new Error(`AI gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = (json.choices?.[0]?.message?.content ?? "{}").replace(/```json|```/g, "").trim();
    let parsed: {
      title?: string;
      totalMinutes?: number;
      steps?: Array<{ i: number; action: string; output: string; why?: string; estMinutes?: number }>;
    } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }

    const steps = (parsed.steps ?? [])
      .filter((s) => Number.isInteger(s.i) && s.i >= 0 && s.i < TOOLS.length)
      .slice(0, 6)
      .map((s) => ({
        i: s.i,
        tool: TOOLS[s.i],
        action: String(s.action ?? "").slice(0, 220),
        output: String(s.output ?? "").slice(0, 100),
        why: String(s.why ?? "").slice(0, 140),
        estMinutes: Math.max(5, Math.min(240, Math.round(Number(s.estMinutes ?? 20)))),
      }));

    const totalMinutes = steps.reduce((n, s) => n + s.estMinutes, 0);
    return {
      title: String(parsed.title ?? "Your roadmap").slice(0, 80),
      totalMinutes,
      keywords,
      steps,
    };
  });

// -------- swap a single step ----------

export const aiSwapStep = createServerFn({ method: "POST" })
  .validator((data) => SwapSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const catLower = data.category.toLowerCase();
    const secLower = data.section.toLowerCase();
    const goalTerms = data.goal.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const actTerms = data.stepAction.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    const excluded = new Set(data.exclude ?? []);
    excluded.add(data.currentToolId);

    // Candidates: same category/section first, then keyword-scored.
    const sameBucket: number[] = [];
    for (let i = 0; i < TOOLS.length && sameBucket.length < 60; i++) {
      if (excluded.has(i)) continue;
      const t = TOOLS[i];
      if (t.category.toLowerCase() === catLower || t.section.toLowerCase() === secLower) {
        sameBucket.push(i);
      }
    }
    const scored = scoreAgainst([goalTerms, actTerms], 120).filter((i) => !excluded.has(i));
    const pool = Array.from(new Set([...sameBucket, ...scored])).slice(0, 150);
    if (pool.length === 0) return { tool: null as null };

    const index = pool.map((i) => `${i}|${TOOLS[i].name}|${TOOLS[i].category}|${TOOLS[i].section}`).join("\n");
    const system = `Pick ONE alternative tool for the given step. Reply ONLY as JSON: {"i":INDEX,"why":"6-12 word rationale"}. No prose.`;
    const user = `GOAL: ${data.goal}\nSTEP ACTION: ${data.stepAction}\nCURRENT: ${TOOLS[data.currentToolId]?.name}\nEXCLUDE INDEXES: ${Array.from(excluded).join(",")}\n\nCANDIDATES:\n${index}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.6,
      }),
    });
    if (!res.ok) throw new Error(`AI gateway ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = (json.choices?.[0]?.message?.content ?? "{}").replace(/```json|```/g, "").trim();
    let parsed: { i?: number; why?: string } = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
    }
    if (
      typeof parsed.i !== "number" ||
      !Number.isInteger(parsed.i) ||
      parsed.i < 0 ||
      parsed.i >= TOOLS.length ||
      excluded.has(parsed.i)
    ) {
      // fallback to first pool candidate
      const fallback = pool[0];
      return { i: fallback, tool: TOOLS[fallback], why: "Similar tool from the same category." };
    }
    return { i: parsed.i, tool: TOOLS[parsed.i], why: String(parsed.why ?? "").slice(0, 100) };
  });
