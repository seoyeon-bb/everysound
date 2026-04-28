"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { SoundCard } from "@/components/sound/SoundCard";
import { ArchiveTabs, type ArchiveTabKey } from "@/components/archive/ArchiveTabs";
import { ArchiveSort, type SortKey } from "@/components/archive/ArchiveSort";
import { UploadFab } from "@/components/archive/UploadFab";
import { SearchInput } from "@/components/ui/SearchInput";
import { Toast } from "@/components/ui/Toast";
import { useSounds } from "@/hooks/useSounds";
import { useDeviceId } from "@/hooks/useDeviceId";
import { addToLaunchpad } from "@/hooks/useLaunchpad";
import { searchMatches } from "@/lib/search";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import type { Sound } from "@/types/sound";

export default function ArchivePage() {
  const t = useTranslations("archive");
  const tCat = useTranslations("category");
  const [tab, setTab] = useState<ArchiveTabKey>("all");
  const [sort, setSort] = useState<SortKey>("played");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const { deviceId } = useDeviceId();
  const { sounds: allSounds, loading, error } = useSounds();
  const headerVisible = useScrollDirection();

  const sounds = useMemo(() => {
    let arr = allSounds.slice();

    if (tab === "mine") {
      arr = arr.filter((s) => s.device_id === deviceId);
    } else if (tab !== "all") {
      arr = arr.filter((s) => s.category === tab);
    }

    if (query.trim()) {
      arr = arr.filter((s) =>
        searchMatches(query, s.title, s.summary, s.category, tCat(s.category)),
      );
    }

    arr.sort((a, b) => {
      if (sort === "played") return b.play_count - a.play_count;
      if (sort === "recommended") return b.recommend_count - a.recommend_count;
      if (sort === "added") return b.launchpad_add_count - a.launchpad_add_count;
      return b.created_at.localeCompare(a.created_at);
    });

    return arr;
  }, [allSounds, tab, sort, query, tCat, deviceId]);

  const handleAddToLaunchpad = async (sound: Sound) => {
    if (!deviceId) return;
    const result = await addToLaunchpad(deviceId, sound.id);
    if (result.ok) {
      setToast({ type: "success", message: t("toast.addedToLaunchpad") });
    } else if (result.error === "already_added") {
      setToast({ type: "error", message: t("toast.alreadyAdded") });
    } else if (result.error === "launchpad_full") {
      setToast({ type: "error", message: t("toast.launchpadFull") });
    } else {
      setToast({ type: "error", message: t("toast.addFailed", { message: result.error }) });
    }
  };

  return (
    <>
      <div className="sticky top-0 z-30 bg-neutral-950">
        <div
          className={`overflow-hidden transition-[max-height,opacity] duration-300 ${
            headerVisible ? "max-h-[280px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <header className="px-5 pt-6">
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          </header>

          <p className="mt-2 px-5 text-[11px] leading-snug text-neutral-500">
            {t("guideline")}
          </p>

          <div className="mt-4 px-5">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={t("searchPlaceholder")}
            />
          </div>
        </div>

        <div className="px-5 pt-3">
          <ArchiveTabs active={tab} onChange={setTab} />
        </div>

        <div className="flex items-center justify-end px-5 py-3">
          <ArchiveSort active={sort} onChange={setSort} />
        </div>
      </div>

      <ul>
        {loading ? (
          <li className="px-5 py-16 text-center text-sm text-neutral-500">
            {t("loading")}
          </li>
        ) : error ? (
          <li className="px-5 py-16 text-center text-sm text-rose-400">
            {t("error", { message: error })}
          </li>
        ) : sounds.length === 0 ? (
          <li className="px-5 py-16 text-center text-sm text-neutral-500">
            {query.trim()
              ? t("empty.search")
              : tab === "mine"
                ? t("empty.mine")
                : t("empty.all")}
          </li>
        ) : (
          sounds.map((s) => (
            <li key={s.id}>
              <SoundCard sound={s} onAddToLaunchpad={handleAddToLaunchpad} />
            </li>
          ))
        )}
      </ul>

      <UploadFab />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
