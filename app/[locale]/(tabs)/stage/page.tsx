"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { StageCard } from "@/components/stage/StageCard";
import { StageSort, type StageSortKey } from "@/components/stage/StageSort";
import { MOCK_STAGE } from "@/lib/mock/stage";

export default function StagePage() {
  const t = useTranslations("stage");
  const [sort, setSort] = useState<StageSortKey>("played");
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());

  const recordings = useMemo(() => {
    const arr = MOCK_STAGE.slice();
    arr.sort((a, b) => {
      if (sort === "played") return b.play_count - a.play_count;
      if (sort === "liked") return b.like_count - a.like_count;
      return b.created_at.localeCompare(a.created_at);
    });
    return arr;
  }, [sort]);

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
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("subtitle")}</p>
      </header>

      <div className="mt-4 flex items-center justify-end px-5">
        <StageSort active={sort} onChange={setSort} />
      </div>

      <ul className="mt-3">
        {recordings.length === 0 ? (
          <li className="px-5 py-16 text-center text-sm text-neutral-500">
            {t("empty")}
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
