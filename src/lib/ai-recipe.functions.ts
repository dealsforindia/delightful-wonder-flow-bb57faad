import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildRoadmap, swapStep } from "./ai-tools.server";

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

export const aiRecipe = createServerFn({ method: "POST" })
  .validator((data) => GoalSchema.parse(data))
  .handler(async ({ data }) => {
    const roadmap = await buildRoadmap(data.goal, "", {
      refine: data.refine,
      previous: data.previous,
    });

    return {
      title: roadmap.title,
      totalMinutes: roadmap.totalMinutes,
      keywords: roadmap.keywords,
      steps: roadmap.steps.map((s) => ({
        i: s.i,
        tool: { name: s.name, url: s.url, category: s.category, section: s.section },
        action: s.action,
        output: s.output,
        why: s.why,
        estMinutes: s.estMinutes,
      })),
    };
  });

export const aiSwapStep = createServerFn({ method: "POST" })
  .validator((data) => SwapSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const result = await swapStep(data, apiKey);
    if ("tool" in result && result.tool === null) return { tool: null as null };
    return {
      i: result.i,
      tool: {
        name: result.tool.name,
        url: result.tool.url,
        category: result.tool.category,
        section: result.tool.section,
      },
      why: result.why,
    };
  });
