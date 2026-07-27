import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { buildRoadmap, rankTools } from "@/lib/ai-tools.server";
import { TOOLS } from "@/lib/tools-data.server";
import type { Tool } from "@/lib/tools-data";

type ChatRequestBody = {
  messages?: UIMessage[];
  mode?: "search" | "roadmap";
  memory?: string;
};

export const Route = createFileRoute("/api/ai-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(body.messages)) {
          return new Response("messages required", { status: 400 });
        }

        const gateway = createLovableAiGatewayProvider();
        // Upgraded from flash to pro for stronger reasoning + planning.
        const model = gateway("google/gemini-3.1-pro-preview");

        const mode = body.mode === "roadmap" ? "roadmap" : body.mode === "search" ? "search" : "auto";
        const modeHint =
          mode === "roadmap"
            ? "The user is here to build a step-by-step plan. Prefer build_roadmap when it fits."
            : mode === "search"
              ? "The user is here to find tools. Prefer search_tools."
              : "";

        const memoryBlock = body.memory && body.memory.trim()
          ? `\n\nWHAT YOU REMEMBER ABOUT THIS USER (persisted across chats — treat as ground truth unless contradicted):\n${body.memory.trim()}\n\nIf the user shares a new stable fact about themselves (goal, budget, OS, skill level, hardware, tolerance for signup, etc.), call remember_user to save it. Do NOT save one-off preferences.`
          : `\n\nYou have no memory of this user yet. When they reveal a stable fact (goal, budget, OS, skill level, hardware, no-signup preference, etc.), call remember_user to persist it.`;

        const system = `You are Unlocked's concierge — a resourceful, plainspoken expert guide to a curated directory of ${TOOLS.length.toLocaleString()} FREE tools.

How you help:
- The user tells you what they want to DO. You give them a specific, opinionated, DETAILED answer grounded in the directory so they can actually act on it.
- Tools available:
  • search_tools(query) — best matches for an intent.
  • build_roadmap(goal) — 3–6 step chained workflow.
  • list_categories() — see the taxonomy (use when the user asks "what's here" or before browsing).
  • browse_category(category, section?) — enumerate a slice of the directory.
  • compare_tools(names) — side-by-side of specific named tools (pulls real entries from the directory).
  • remember_user(fact) — persist a stable fact about the user.
- ALWAYS call a tool instead of listing tools from memory. Chain tools when useful (e.g. list_categories → browse_category → search_tools).
- Think first. If the ask is vague, ask ONE sharp clarifying question before spending a tool call.

Reply format — be GENUINELY USEFUL, not terse:
- Aim for a substantive answer (typically 150–400 words). Use markdown: short intro, then **## Top picks** with a bullet per recommended tool.
- For each recommended tool, write 2–4 sentences covering: what it actually does, why it fits THIS user's ask, one concrete tip / gotcha / how to start, and when to pick it over an alternative. Reference tools by name (the UI renders link cards separately — don't re-paste URLs).
- If you built a roadmap, add a **## How to run it** section: what to do first, what "done" looks like at each step, realistic time expectations, and where people usually get stuck.
- If you compared tools, add a **## Which to pick** verdict tailored to the user's context (OS, budget, skill, memory facts).
- End with a **## Next step** line: one concrete thing the user should do right now, or a sharp follow-up question.
- Never re-list raw tool names as a bare list — always add reasoning. Never say "here are some tools" and stop. No filler, no hedging, no "I hope this helps".
- If the user quotes an earlier reply (line starting with "> "), answer about THAT specific thing in depth.
- Talk like a knowledgeable friend who has actually used these tools.
${modeHint}${memoryBlock}`;

        const tools = {
          search_tools: tool({
            description: "Search the Unlocked directory for the best matches to a user's intent.",
            inputSchema: z.object({
              query: z.string().min(2).describe("Natural-language description of what the user needs"),
              limit: z.number().int().min(1).max(10).default(6),
            }),
            execute: async ({ query, limit }) => {
              const ranked = await rankTools(query, undefined, limit, undefined, apiKey);
              return {
                query,
                results: ranked.map(({ i, tool: t, why }) => ({
                  i, name: t.name, url: t.url, category: t.category, section: t.section, why,
                })),
              };
            },
          }),
          build_roadmap: tool({
            description: "Design a 3–6 step workflow to achieve a real-world GOAL, chaining free tools from the directory.",
            inputSchema: z.object({ goal: z.string().min(3) }),
            execute: async ({ goal }) => {
              const roadmap = await buildRoadmap(goal, apiKey);
              return {
                goal: roadmap.goal,
                title: roadmap.title,
                totalMinutes: roadmap.totalMinutes,
                steps: roadmap.steps.map((s) => ({
                  i: s.i, name: s.name, url: s.url, category: s.category, section: s.section,
                  action: s.action, output: s.output, why: s.why, estMinutes: s.estMinutes,
                })),
              };
            },
          }),
          list_categories: tool({
            description: "List every category in the directory with tool counts and sections. Use before browse_category.",
            inputSchema: z.object({}),
            execute: async () => {
              const byCat = new Map<string, { count: number; sections: Map<string, number> }>();
              for (const t of TOOLS) {
                const c = byCat.get(t.category) ?? { count: 0, sections: new Map() };
                c.count++;
                c.sections.set(t.section, (c.sections.get(t.section) ?? 0) + 1);
                byCat.set(t.category, c);
              }
              const categories = Array.from(byCat.entries())
                .map(([category, v]) => ({
                  category, count: v.count,
                  sections: Array.from(v.sections.entries())
                    .map(([name, count]) => ({ name, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 12),
                }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 30);
              return { total: TOOLS.length, categories };
            },
          }),
          browse_category: tool({
            description: "Enumerate tools in a category (optionally scoped to a section). Use list_categories first to find valid names.",
            inputSchema: z.object({
              category: z.string().min(2),
              section: z.string().optional(),
              limit: z.number().int().min(1).max(20).default(10),
            }),
            execute: async ({ category, section, limit }) => {
              const c = category.toLowerCase();
              const s = section?.toLowerCase();
              let results: Tool[] = TOOLS.filter((t) => t.category.toLowerCase() === c);
              if (s) results = results.filter((t) => t.section.toLowerCase() === s);
              const slice = results.slice(0, limit);
              return {
                category, section: section ?? null, totalInCategory: results.length,
                results: slice.map((t, i) => ({
                  i: TOOLS.indexOf(t), name: t.name, url: t.url, category: t.category, section: t.section,
                  _rank: i,
                })),
              };
            },
          }),
          compare_tools: tool({
            description: "Look up specific named tools from the directory and return them side-by-side. Use when the user asks 'X vs Y' or 'compare A, B, C'.",
            inputSchema: z.object({
              names: z.array(z.string().min(2)).min(2).max(6),
            }),
            execute: async ({ names }) => {
              const results = names.map((n) => {
                const needle = n.toLowerCase();
                const exact = TOOLS.find((t) => t.name.toLowerCase() === needle);
                const partial = exact ?? TOOLS.find((t) => t.name.toLowerCase().includes(needle));
                return partial
                  ? { query: n, found: true as const, i: TOOLS.indexOf(partial), name: partial.name, url: partial.url, category: partial.category, section: partial.section }
                  : { query: n, found: false as const };
              });
              return { results };
            },
          }),
          remember_user: tool({
            description: "Persist a stable fact about the user for future chats (e.g. 'wants passive income, prefers no-signup, on Windows'). Keep facts short and durable. Do NOT save one-off asks.",
            inputSchema: z.object({
              fact: z.string().min(3).max(200).describe("A single stable fact, phrased in third person."),
            }),
            execute: async ({ fact }) => {
              // Client persists — server just echoes so client-side effect picks it up.
              return { saved: true, fact };
            },
          }),
        };

        const result = streamText({
          model,
          system,
          messages: convertToModelMessages(body.messages),
          tools,
          stopWhen: stepCountIs(12),
          temperature: 0.4,
          providerOptions: {
            lovable: { reasoning: { effort: "low" } },
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: body.messages,
          sendReasoning: true,
        });
      },
    },
  },
});
