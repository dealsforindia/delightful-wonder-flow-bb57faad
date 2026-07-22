import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TOOLS } from "./tools-data";

const InputSchema = z.object({ query: z.string().min(2).max(300) });

// Compact index built once per worker isolate
let INDEX_CACHE: string | null = null;
function buildIndex() {
  if (INDEX_CACHE) return INDEX_CACHE;
  INDEX_CACHE = TOOLS.map((t, i) => `${i}|${t.name}|${t.section}|${t.category}`).join("\n");
  return INDEX_CACHE;
}

export const aiSearch = createServerFn({ method: "POST" })
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const index = buildIndex();
    const system = `You are a search engine over a curated directory of ${TOOLS.length} free tools from FMHY.
Each line: INDEX|NAME|SECTION|CATEGORY.
Given a user intent, return the 8 MOST RELEVANT tools ranked best-first.
Reply ONLY with a JSON array like [{"i":123,"why":"short 6-word reason"}]. No prose, no markdown.`;

    const user = `INTENT: ${data.query}\n\nDIRECTORY:\n${index}`;

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
