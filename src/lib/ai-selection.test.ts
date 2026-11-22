import { describe, test } from "node:test";
import { deepStrictEqual } from "node:assert";
import { selectCandidates } from "./ai-selection";

describe("grounded AI selections", () => {
  test("rejects entries outside the supplied candidates", () => {
    deepStrictEqual(selectCandidates([{ i: 2 }, { i: 99 }, { i: 2.5 }], [2, 5], 6), [{ i: 2 }]);
  });
  test("a roadmap never repeats a tool", () => {
    deepStrictEqual(selectCandidates([{ i: 5 }, { i: 5 }, { i: 2 }], [2, 5], 6), [{ i: 5 }, { i: 2 }]);
  });
  test("keeps ranked order and requested limit", () => {
    deepStrictEqual(selectCandidates([{ i: 5 }, { i: 2 }], [2, 5], 1), [{ i: 5 }]);
  });
  test("an empty shortlist cannot produce recommendations", () => {
    deepStrictEqual(selectCandidates([{ i: 2 }], [], 6), []);
  });
});