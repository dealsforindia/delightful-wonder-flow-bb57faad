import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  jobPosting: z.string().min(20).max(8000),
  resume: z.string().min(20).max(8000),
  tone: z.enum(["confident", "warm", "direct", "enthusiastic"]).default("confident"),
});

export const generateCoverLetter = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      throw new Error(
        "AI is not configured for this project. Enable Lovable Cloud to get an API key.",
      );
    }

    const system = `You write cover letters that get interviews. Rules:
- 250-350 words. Never longer.
- Open with a specific hook tied to the company or role — never "I am writing to apply".
- Second paragraph: 2-3 concrete achievements from the candidate's CV that map directly to the job's requirements. Quantify where possible.
- Third paragraph: why THIS company specifically (infer from the posting).
- Close with a confident, low-pressure call to action.
- Plain prose. No bullet points. No headers. No "Dear Hiring Manager" — start with "Hi [Company] team," if no name is given, otherwise "Dear [Name],".
- Tone: ${data.tone}.
- Return ONLY the letter body. No preamble, no explanation, no markdown.`;

    const user = `JOB POSTING:
${data.jobPosting}

CANDIDATE CV / BACKGROUND:
${data.resume}

Write the cover letter now.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) {
        throw new Error("Too many requests — try again in a moment.");
      }
      if (res.status === 402) {
        throw new Error("AI credits exhausted. Add credits in workspace settings.");
      }
      throw new Error(`AI request failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const letter = json.choices?.[0]?.message?.content?.trim() ?? "";
    if (!letter) throw new Error("Empty response from AI.");
    return { letter };
  });
