import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TOOLS } from "./tools-data.server";

const InputSchema = z.object({ query: z.string().min(2).max(300) });

// Lightweight fuzzy prefilter — with 14k+ tools we can't ship the whole index
// to the LLM every call. Score & keep top 400 candidates, then let AI rank.
function prefilter(query: string, k = 400) {
  const q = query.toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);
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
  const picks = scored.slice(0, k);
  // If prefilter is thin, top up with a random sample so the LLM still gets breadth
  if (picks.length < 80) {
    const step = Math.max(1, Math.floor(TOOLS.length / (k - picks.length)));
    for (let i = 0; i < TOOLS.length && picks.length < k; i += step) picks.push({ i, s: 0 });
  }
  return picks.map((p) => p.i);
}

export const aiSearch = createServerFn({ method: "POST" })
  .validator((data) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const ids = prefilter(data.query);
    const index = ids.map((i) => `${i}|${TOOLS[i].name}|${TOOLS[i].section}|${TOOLS[i].category}`).join("\n");
    const system = `You are a search engine over a curated directory of ${TOOLS.length} free tools from FMHY.
Each line: INDEX|NAME|SECTION|CATEGORY.
Given a user intent, return the 8 MOST RELEVANT tools ranked best-first.
Reply ONLY with a JSON array like [{"i":123,"why":"short 6-word reason"}]. No prose, no markdown.`;

    const user = `INTENT: ${data.query}\n\nCANDIDATES:\n${index}`;


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
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI gateway ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "[]";
    const cleaned = content.replace(/```json|```/g, "").trim();
    let parsed: Array<{ i: number; why: string }> = [];
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const m = cleaned.match(/\[[\s\S]*\]/);
      if (m) parsed = JSON.parse(m[0]);
    }

    return parsed
      .filter((r) => Number.isInteger(r.i) && r.i >= 0 && r.i < TOOLS.length)
      .slice(0, 8)
      .map((r) => ({ tool: TOOLS[r.i], why: String(r.why ?? "").slice(0, 120) }));
  });
