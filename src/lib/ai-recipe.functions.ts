import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TOOLS } from "./tools-data";

const InputSchema = z.object({ goal: z.string().min(3).max(400) });

let INDEX_CACHE: string | null = null;
function buildIndex() {
  if (INDEX_CACHE) return INDEX_CACHE;
  INDEX_CACHE = TOOLS.map((t, i) => `${i}|${t.name}|${t.category}|${t.section}`).join("\n");
  return INDEX_CACHE;
}

export const aiRecipe = createServerFn({ method: "POST" })
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const index = buildIndex();
    const system = `You are a resourceful strategist. Given a real-world goal, design a 3-6 step RECIPE that uses ONLY the free tools from the directory below (referenced by INDEX number).
Each step must be a concrete action. Combine tools cleverly. Prefer non-obvious combinations over single-tool answers.

Reply ONLY with JSON:
{"title":"catchy plan title","steps":[{"i":INDEX,"action":"imperative sentence, 10-18 words","output":"what you have after this step, 4-8 words"}]}
No prose, no markdown fences.`;

    const user = `GOAL: ${data.goal}\n\nDIRECTORY (${TOOLS.length} tools):\n${index}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
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
    let parsed: { title?: string; steps?: Array<{ i: number; action: string; output: string }> } = {};
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
        tool: TOOLS[s.i],
        action: String(s.action ?? "").slice(0, 200),
        output: String(s.output ?? "").slice(0, 80),
      }));

    return { title: String(parsed.title ?? "Your recipe").slice(0, 80), steps };
  });
