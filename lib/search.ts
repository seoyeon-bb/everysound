export function normalizeForSearch(s: string | null | undefined): string {
  if (!s) return "";
  return s.toLowerCase().replace(/\s+/g, "");
}

export function searchMatches(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;
  return fields.some((f) => normalizeForSearch(f).includes(q));
}
