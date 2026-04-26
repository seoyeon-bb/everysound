"use client";

import { useTranslations } from "next-intl";

interface Props {
  active: boolean;
  onToggle: () => void;
}

export function PitchFilterChip({ active, onToggle }: Props) {
  const t = useTranslations("archive.filter");
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
          : "border-neutral-800 text-neutral-400 hover:text-neutral-200"
      }`}
    >
      {active ? "♪ " : ""}
      {t("pitch")}
    </button>
  );
}
