"use client";

import { useTranslations } from "next-intl";
import { CATEGORY_KEYS, type CategoryKey } from "@/lib/categories";

export type ArchiveTabKey = "all" | CategoryKey | "mine";

interface Props {
  active: ArchiveTabKey;
  onChange: (k: ArchiveTabKey) => void;
}

export function ArchiveTabs({ active, onChange }: Props) {
  const tCat = useTranslations("category");
  const tArc = useTranslations("archive.tabs");

  const items: { key: ArchiveTabKey; label: string }[] = [
    { key: "all", label: tArc("all") },
    ...CATEGORY_KEYS.map((k) => ({ key: k satisfies CategoryKey, label: tCat(k) })),
    { key: "mine", label: tArc("mine") },
  ];

  return (
    <nav
      aria-label="archive categories"
      className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex gap-2 whitespace-nowrap pb-1">
        {items.map((it) => {
          const isActive = it.key === active;
          return (
            <li key={it.key}>
              <button
                type="button"
                onClick={() => onChange(it.key)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-neutral-100 text-neutral-950"
                    : "bg-neutral-900 text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {it.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
