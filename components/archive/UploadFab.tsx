"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export function UploadFab() {
  const t = useTranslations("archive");
  return (
    <Link
      href="/archive/upload"
      aria-label={t("fab")}
      className="fixed bottom-20 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/30 transition active:scale-95"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        className="h-6 w-6"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  );
}
