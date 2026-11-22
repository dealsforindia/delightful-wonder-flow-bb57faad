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