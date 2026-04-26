"use client";

import { useTranslations } from "next-intl";
import { CATEGORY_KEYS, type CategoryKey } from "@/lib/categories";

interface Props {
  value: CategoryKey | null;
  onChange: (k: CategoryKey) => void;
}

export function CategoryPicker({ value, onChange }: Props) {
  const tCat = useTranslations("category");
  return (
    <div className="flex flex-wrap gap-1.5">
      {CATEGORY_KEYS.map((k) => {
        const active = k === value;
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-emerald-500 text-neutral-950"
                : "bg-neutral-900 text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {tCat(k)}
          </button>
        );
      })}
    </div>
  );
}
