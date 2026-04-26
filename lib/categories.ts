export const CATEGORY_KEYS = [
  "voice",
  "beatbox",
  "body",
  "mouth",
  "percussion",
  "strings",
  "wind",
  "keys",
  "electronic",
  "animal",
  "nature",
  "environment",
  "object",
  "sfx",
  "other",
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export const isCategoryKey = (v: string): v is CategoryKey =>
  (CATEGORY_KEYS as readonly string[]).includes(v);
