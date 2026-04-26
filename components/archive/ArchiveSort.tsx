"use client";

import { useTranslations } from "next-intl";

export type SortKey = "played" | "added" | "created";

const SORT_KEYS: SortKey[] = ["played", "added", "created"];

interface Props {
  active: SortKey;
  onChange: (k: SortKey) => void;
}

export function ArchiveSort({ active, onChange }: Props) {
  const t = useTranslations("archive.sort");
  return (
    <div className="flex items-center gap-1 text-xs">
      {SORT_KEYS.map((k, i) => (
        <span key={k} className="flex items-center">
          {i > 0 && <span className="mx-1 text-neutral-700">·</span>}
          <button
            type="button"
            onClick={() => onChange(k)}
            className={`font-medium transition ${
              active === k
                ? "text-emerald-400"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {t(k)}
          </button>
        </span>
      ))}
    </div>
  );
}
