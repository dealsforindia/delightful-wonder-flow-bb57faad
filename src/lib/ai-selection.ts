/** AI selections must come from the supplied shortlist, once each. */
export function selectCandidates<T extends { i: number }>(
  selections: T[], candidates: number[], limit: number,
): T[] {
  const allowed = new Set(candidates);
  const seen = new Set<number>();
  return selections.filter(({ i }) => {
    if (!Number.isInteger(i) || !allowed.has(i) || seen.has(i)) return false;
    seen.add(i);
    return true;
  }).slice(0, limit);
}
/**
 * Map a model's local pick numbers (1-based over `candidates`) back to tool IDs.
 * The named tool wins over the number; picks whose name matches no candidate are dropped.
 */
export function resolveNamedPicks<T extends { i: number; name?: string | null }>(
  picks: T[], candidates: number[], nameOf: (id: number) => string,
): Array<T & { i: number }> {
  const norm = (v: string) => v.replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").trim().toLowerCase();
  return picks.map((pick) => {
    const byNumber = candidates[pick.i - 1];
    if (!pick.name) return { ...pick, i: byNumber ?? -1 };
    const wanted = norm(pick.name);
    if (byNumber !== undefined && norm(nameOf(byNumber)) === wanted) return { ...pick, i: byNumber };
    const byName = candidates.find((id) => norm(nameOf(id)) === wanted);
    return { ...pick, i: byName ?? -1 };
  });
}
