import { test } from "node:test";
import { strictEqual } from "node:assert";
import { APICallError } from "ai";
import { aiErrorMessage } from "./ai-errors";

test("usage limits are not disguised as random service hiccups", () => {
  const error = new APICallError({ message: "Quota exhausted", statusCode: 429, url: "https://example.com", requestBodyValues: {} });
  strictEqual(aiErrorMessage(error), "The AI service has reached its usage limit. Wait for the limit to reset, or ask the site owner to check the Google AI quota.");
});
test("access denial preserves the provider's reason", () => {
  const error = new APICallError({ message: "Access disabled", statusCode: 403, url: "https://example.com", requestBodyValues: {} });
  strictEqual(aiErrorMessage(error), "AI access was denied: Access disabled");
});
test("explicit Stop is not reported as a failure", () => {
  strictEqual(aiErrorMessage(new DOMException("Stopped", "AbortError")), "Reply stopped.");
});