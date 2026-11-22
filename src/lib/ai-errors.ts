import { APICallError } from "ai";

export function aiErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === "AbortError") return "Reply stopped.";
  if (APICallError.isInstance(error)) {
    if (error.statusCode === 429) return "The AI service has reached its usage limit. Wait for the limit to reset, or ask the site owner to check the Google AI quota.";
    if (error.statusCode === 401) return "The AI service connection is invalid. The site owner needs to check the AI key.";
    if (error.statusCode === 403) return `AI access was denied: ${error.message}`;
    if (error.statusCode === 404) return "The configured AI model is unavailable. The site owner needs to check the AI service.";
  }
  return "The AI service could not finish this reply. Your completed results are still available.";
}