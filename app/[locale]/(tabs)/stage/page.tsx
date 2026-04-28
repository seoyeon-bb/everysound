"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { StageCard } from "@/components/stage/StageCard";
import { StageSort, type StageSortKey } from "@/components/stage/StageSort";
import { SearchInput } from "@/components/ui/SearchInput";
import { useStageRecordings } from "@/hooks/useStageRecordings";
import { searchMatches } from "@/lib/search";

export default function StagePage() {
  const t = useTranslations("stage");
  const [sort, setSort] = useState<StageSortKey>("played");
  const [query, setQuery] = useState("");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const { recordings: all, loading, error } = useStageRecordings();

  const recordings = useMemo(() => {
    let arr = all.slice();
    if (query.trim()) {
      arr = arr.filter((r) => searchMatches(query, r.title, r.summary));
    }
    arr.sort((a, b) => {
      if (sort === "played") return b.play_count - a.play_count;
      if (sort === "liked") return b.like_count - a.like_count;
      return b.created_at.localeCompare(a.created_at);
    });
    return arr;
  }, [all, sort, query]);

  const toggleLike = (id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <header className="px-5 pt-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </header>

      <p className="mt-2 px-5 text-[11px] leading-snug text-neutral-500">
        {t("subtitle")}
      </p>

      <div className="mt-4 px-5">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder={t("searchPlaceholder")}
        />
      </div>

      <div className="mt-3 flex items-center justify-end px-5">
        <StageSort active={sort} onChange={setSort} />
      </div>

      <ul className="mt-3">
        {loading ? (
          <li className="px-5 py-16 text-center text-sm text-neutral-500">
            {t("loading")}
          </li>
        ) : error ? (
          <li className="px-5 py-16 text-center text-sm text-rose-400">
            {t("errorState", { message: error })}
          </li>
        ) : recordings.length === 0 ? (
          <li className="px-5 py-16 text-center text-sm text-neutral-500">
            {query.trim() ? t("empty.search") : t("empty.all")}
          </li>
        ) : (
          recordings.map((r) => (
            <li key={r.id}>
              <StageCard
                recording={r}
                liked={likedIds.has(r.id)}
                onToggleLike={() => toggleLike(r.id)}
              />
            </li>
          ))
        )}
      </ul>
    </>
  );
}
