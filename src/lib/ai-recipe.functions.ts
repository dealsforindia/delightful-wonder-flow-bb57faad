import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TOOLS } from "./tools-data.server";

const InputSchema = z.object({ goal: z.string().min(3).max(400) });

// Prefilter: score tools by keyword overlap with goal, keep top 500 + broad sample.
function prefilter(goal: string, k = 500) {
  const terms = goal.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  const scored: Array<{ i: number; s: number }> = [];
  for (let i = 0; i < TOOLS.length; i++) {
    const t = TOOLS[i];
    const hay = (t.name + " " + t.section + " " + t.category).toLowerCase();
    let s = 0;
    for (const term of terms) if (hay.includes(term)) s += 10;
    if (s > 0) scored.push({ i, s });
  }
  scored.sort((a, b) => b.s - a.s);
  const picks = scored.slice(0, k).map((p) => p.i);
  // Broaden with a sample so the model can propose non-obvious combos
  const step = Math.max(1, Math.floor(TOOLS.length / 200));
  for (let i = 0; i < TOOLS.length && picks.length < k + 200; i += step) picks.push(i);
  return Array.from(new Set(picks));
}

export const aiRecipe = createServerFn({ method: "POST" })
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const ids = prefilter(data.goal);
    const index = ids.map((i) => `${i}|${TOOLS[i].name}|${TOOLS[i].category}|${TOOLS[i].section}`).join("\n");
    const system = `You are a resourceful strategist. Given a real-world goal, design a 3-6 step RECIPE that uses ONLY the free tools from the directory below (referenced by INDEX number).
Each step must be a concrete action. Combine tools cleverly. Prefer non-obvious combinations over single-tool answers.

Reply ONLY with JSON:
{"title":"catchy plan title","steps":[{"i":INDEX,"action":"imperative sentence, 10-18 words","output":"what you have after this step, 4-8 words"}]}
No prose, no markdown fences.`;

    const user = `GOAL: ${data.goal}\n\nCANDIDATES (${ids.length} of ${TOOLS.length} total):\n${index}`;


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
