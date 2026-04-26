"use client";

import { useTranslations } from "next-intl";

export type StageSortKey = "played" | "liked" | "created";

const SORT_KEYS: StageSortKey[] = ["played", "liked", "created"];

interface Props {
  active: StageSortKey;
  onChange: (k: StageSortKey) => void;
}

export function StageSort({ active, onChange }: Props) {
  const t = useTranslations("stage.sort");
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
