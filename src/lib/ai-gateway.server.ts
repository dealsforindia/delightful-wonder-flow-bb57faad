import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGoogle } from "@ai-sdk/google";

/**
 * BYO-keys AI gateway.
 *
 * Set one or both of these env vars on your server:
 *   GOOGLE_API_KEY   -> used for any "google/..." model (via Google's official Gemini API)
 *   OPENAI_API_KEY   -> used for any "openai/..." model (via OpenAI directly)
 *
 * The old LOVABLE_API_KEY is no longer required. If you still have it set,
 * it's ignored — this app now talks directly to the model providers you pay for.
 *
 * Usage stays the same everywhere in the app:
 *   const gateway = createLovableAiGatewayProvider();
 *   const model = gateway("google/gemini-2.5-flash");
 */
export function createLovableAiGatewayProvider(_ignoredApiKey?: string) {
  const googleKey = process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const google = googleKey
    ? createGoogle({
        apiKey: googleKey,
      })
    : null;

  const openai = openaiKey
    ? createOpenAICompatible({
        name: "openai",
        baseURL: "https://api.openai.com/v1",
        headers: { Authorization: `Bearer ${openaiKey}` },
      })
    : null;

  return (fullModelId: string) => {
    const [vendor, ...rest] = fullModelId.split("/");
    const bareModel = rest.join("/") || fullModelId;

    if (vendor === "google") {
      if (!google) {
        throw new Error(
          "GOOGLE_API_KEY is not set. Add it to your .env to use google/* models.",
        );
      }
      return google(bareModel);
    }

    if (vendor === "openai") {
      if (!openai) {
        throw new Error(
          "OPENAI_API_KEY is not set. Add it to your .env to use openai/* models.",
        );
      }
      return openai(bareModel);
    }

    throw new Error(
      `Unsupported model vendor "${vendor}". Use "google/..." or "openai/..." model ids.`,
    );
  };
}
