import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { TOOLS } from "@/lib/tools-data.server";

type ScoredId = { i: number; s: number };

function scoreTools(query: string, k: number): number[] {
  const terms = query.toLowerCase().split(/[\s,./;]+/).filter((t) => t.length > 2);
  if (terms.length === 0) return [];
  const scored: ScoredId[] = [];
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

async function expandKeywords(apiKey: string, goal: string): Promise<string[]> {
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              'Break the user goal into 3-6 short workflow keywords, each 1-3 words. Reply JSON only: {"keywords":["..."]}',
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
      return parsed.keywords.map((k) => String(k).toLowerCase()).filter(Boolean).slice(0, 6);
    }
  } catch {
    // fall through
  }
  return goal.toLowerCase().split(/[\s,./;]+/).filter((t) => t.length > 2).slice(0, 6);
}

export const Route = createFileRoute("/api/ai-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { messages?: UIMessage[] };
        if (!Array.isArray(body.messages)) {
          return new Response("messages required", { status: 400 });
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-2.5-flash");

        const system = `You are Unlocked's concierge — a resourceful, plainspoken guide to a curated directory of ${TOOLS.length.toLocaleString()} FREE tools (mirror of FMHY).

How you help:
- The user tells you what they want to DO (make money with affiliate marketing, back up their photos, learn Japanese, etc.). You give them a specific, opinionated answer.
- You have two tools available:
  • search_tools(query) — finds the best matching tools in the directory. Use it whenever the user asks for a tool, an alternative, "what should I use for X", or wants to compare options.
  • build_roadmap(goal) — designs a 3-6 step workflow chaining several tools from the directory. Use it when the user describes a multi-step outcome ("start a blog", "earn from X", "self-host Y").
- ALWAYS call the appropriate tool instead of listing tools from memory. The tool returns real entries from the directory with working URLs.
- After a tool returns, write a SHORT reply (2-4 sentences) telling the user what you found and what to do next. Do NOT re-list every tool — the UI renders them as cards. Reference them by name.
- If the user quotes an earlier part of the conversation (a line starting with "> ..."), treat that quote as the specific thing they want to dig into. Answer about THAT.
- Be concrete. No filler like "great question!" or long disclaimers. Talk like a friend who happens to know every free tool.
- If the question is not about tools/workflows, answer briefly and steer back.`;

        const tools = {
          search_tools: tool({
            description:
              "Search the Unlocked directory for the best matching free tools. Returns up to `limit` compact tool records.",
            inputSchema: z.object({
              query: z.string().min(2).describe("Natural-language description of what the user needs"),
              limit: z.number().int().min(1).max(10).default(6),
            }),
            execute: async ({ query, limit }) => {
              const ids = scoreTools(query, limit);
              return {
                query,
                results: ids.map((i) => ({
                  i,
                  name: TOOLS[i].name,
                  url: TOOLS[i].url,
                  category: TOOLS[i].category,
                  section: TOOLS[i].section,
                })),
              };
            },
          }),
          build_roadmap: tool({
            description:
              "Design a 3-6 step workflow to achieve a real-world GOAL, chaining free tools from the Unlocked directory.",
            inputSchema: z.object({
              goal: z.string().min(3).describe("The end outcome the user wants"),
            }),
            execute: async ({ goal }) => {
              const keywords = await expandKeywords(apiKey, goal);
              const perKw = keywords.map((k) => scoreTools(k, 30));
              const merged = new Set<number>(scoreTools(goal, 200));
              for (const arr of perKw) for (const id of arr) merged.add(id);
              const finalIds = Array.from(merged).slice(0, 500);
              const index = finalIds
                .map((i) => `${i}|${TOOLS[i].name}|${TOOLS[i].category}|${TOOLS[i].section}`)
                .join("\n");

              const planSystem = `Design a 3-5 step roadmap for the GOAL using ONLY tools from CANDIDATES (reference by INDEX). Chain distinct sub-tasks, don't repeat a tool.
Reply ONLY as JSON:
{"title":"3-6 word title","steps":[{"i":INDEX,"action":"imperative 10-16 words","why":"6-12 word reason","output":"3-6 words","estMinutes":10}]}`;
              const planUser = `GOAL: ${goal}\nKEYWORDS: ${keywords.join(", ")}\n\nCANDIDATES:\n${index}`;

              const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                method: "POST",
                headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: [
                    { role: "system", content: planSystem },
                    { role: "user", content: planUser },
                  ],
                  temperature: 0.7,
                }),
              });
              if (!res.ok) {
                return { error: `planner failed ${res.status}` };
              }
              const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
              const content = (j.choices?.[0]?.message?.content ?? "{}").replace(/```json|```/g, "").trim();
              let parsed: {
                title?: string;
                steps?: Array<{ i: number; action: string; output?: string; why?: string; estMinutes?: number }>;
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
                  name: TOOLS[s.i].name,
                  url: TOOLS[s.i].url,
                  category: TOOLS[s.i].category,
                  section: TOOLS[s.i].section,
                  action: String(s.action ?? "").slice(0, 220),
                  output: String(s.output ?? "").slice(0, 80),
                  why: String(s.why ?? "").slice(0, 140),
                  estMinutes: Math.max(5, Math.min(240, Math.round(Number(s.estMinutes ?? 20)))),
                }));
              return {
                goal,
                title: String(parsed.title ?? "Your roadmap").slice(0, 80),
                totalMinutes: steps.reduce((n, s) => n + s.estMinutes, 0),
                steps,
              };
            },
          }),
        };

        const result = streamText({
          model,
          system,
          messages: convertToModelMessages(body.messages),
          tools,
          stopWhen: stepCountIs(6),
          temperature: 0.5,
        });

        return result.toUIMessageStreamResponse({ originalMessages: body.messages });
      },
    },
  },
});
