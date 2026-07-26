import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { buildRoadmap, rankTools } from "@/lib/ai-tools.server";
import { TOOLS } from "@/lib/tools-data.server";

type ChatRequestBody = {
  messages?: UIMessage[];
  mode?: "search" | "roadmap";
};

export const Route = createFileRoute("/api/ai-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(body.messages)) {
          return new Response("messages required", { status: 400 });
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        const gateway = createLovableAiGatewayProvider(apiKey);
        const model = gateway("google/gemini-3.6-flash");

        const mode = body.mode === "roadmap" ? "roadmap" : body.mode === "search" ? "search" : "auto";
        const modeHint =
          mode === "roadmap"
            ? "The user is here to build a step-by-step plan. Prefer build_roadmap when it fits."
            : mode === "search"
              ? "The user is here to find tools. Prefer search_tools."
              : "";

        const system = `You are Unlocked's concierge — a resourceful, plainspoken guide to a curated directory of ${TOOLS.length.toLocaleString()} FREE tools (mirror of FMHY).

How you help:
- The user tells you what they want to DO (make money, back up photos, learn a language, etc.). You give them a specific, opinionated answer.
- You have two tools available:
  • search_tools(query) — finds the best matching tools in the directory. Use it whenever the user asks for a tool, an alternative, "what should I use for X", or wants to compare options.
  • build_roadmap(goal) — designs a 3-6 step workflow chaining several tools from the directory. Use it when the user describes a multi-step outcome ("start a blog", "earn from X", "self-host Y").
- ALWAYS call the appropriate tool instead of listing tools from memory. The tool returns real entries with working URLs.
- After a tool returns, write a SHORT reply (2-4 sentences) telling the user what you found and what to do next. Do NOT re-list every tool — the UI renders them as cards. Reference them by name.
- If the user quotes an earlier part of the conversation (a line starting with "> ..."), treat that quote as the specific thing they want to dig into. Answer about THAT.
- Be concrete. No filler like "great question!" or long disclaimers. Talk like a friend who happens to know every free tool.
- If the question is not about tools/workflows, answer briefly and steer back.
${modeHint}`;

        const tools = {
          search_tools: tool({
            description:
              "Search the Unlocked directory of 26,000+ free tools for the best matches to a user's intent.",
            inputSchema: z.object({
              query: z.string().min(2).describe("Natural-language description of what the user needs"),
              limit: z.number().int().min(1).max(10).default(6),
            }),
            execute: async ({ query, limit }) => {
              const ranked = await rankTools(query, undefined, limit, undefined, apiKey);
              return {
                query,
                results: ranked.map(({ i, tool: t }) => ({
                  i,
                  name: t.name,
                  url: t.url,
                  category: t.category,
                  section: t.section,
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
              const roadmap = await buildRoadmap(goal, apiKey);
              return {
                goal: roadmap.goal,
                title: roadmap.title,
                totalMinutes: roadmap.totalMinutes,
                steps: roadmap.steps.map((s) => ({
                  i: s.i,
                  name: s.name,
                  url: s.url,
                  category: s.category,
                  section: s.section,
                  action: s.action,
                  output: s.output,
                  why: s.why,
                  estMinutes: s.estMinutes,
                })),
              };
            },
          }),
        };

        const result = streamText({
          model,
          system,
          messages: convertToModelMessages(body.messages),
          tools,
          stopWhen: stepCountIs(8),
          temperature: 0.5,
        });

        return result.toUIMessageStreamResponse({ originalMessages: body.messages });
      },
    },
  },
});
