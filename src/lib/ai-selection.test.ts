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
import { resolveNamedPicks } from "./ai-selection";
test("roadmap picks map local numbers back to real tool IDs", () => {
  const names: Record<number, string> = { 500: "OBS Studio", 900: "Shotcut" };
  const out = resolveNamedPicks([{ i: 2, name: "Shotcut" }], [500, 900], (id) => names[id] ?? "");
  deepStrictEqual(out[0]?.i, 900);
});
test("a mismatched number is corrected by the tool name", () => {
  const names: Record<number, string> = { 500: "OBS Studio", 900: "Shotcut" };
  const out = resolveNamedPicks([{ i: 1, name: "Shotcut" }], [500, 900], (id) => names[id] ?? "");
  deepStrictEqual(out[0]?.i, 900);
});
test("a pick naming a tool outside the shortlist is dropped", () => {
  const out = resolveNamedPicks([{ i: 1, name: "DaVinci Resolve" }], [500], () => "OBS Studio");
  deepStrictEqual(out[0]?.i, -1);
});
