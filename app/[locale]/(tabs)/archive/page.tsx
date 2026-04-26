"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { SoundCard } from "@/components/sound/SoundCard";
import { ArchiveTabs, type ArchiveTabKey } from "@/components/archive/ArchiveTabs";
import { ArchiveSort, type SortKey } from "@/components/archive/ArchiveSort";
import { PitchFilterChip } from "@/components/archive/PitchFilterChip";
import { UploadFab } from "@/components/archive/UploadFab";
import { MOCK_SOUNDS } from "@/lib/mock/sounds";
import { useDeviceId } from "@/hooks/useDeviceId";

export default function ArchivePage() {
  const t = useTranslations("archive");
  const [tab, setTab] = useState<ArchiveTabKey>("all");
  const [sort, setSort] = useState<SortKey>("played");
  const [pitchOn, setPitchOn] = useState(false);
  const { deviceId } = useDeviceId();

  const sounds = useMemo(() => {
    let arr = MOCK_SOUNDS.slice();

    if (tab === "mine") {
      arr = arr.filter((s) => s.device_id === deviceId);
    } else if (tab !== "all") {
      arr = arr.filter((s) => s.category === tab);
    }
    if (pitchOn) arr = arr.filter((s) => s.pitch);

    arr.sort((a, b) => {
      if (sort === "played") return b.play_count - a.play_count;
      if (sort === "added") return b.launchpad_add_count - a.launchpad_add_count;
      return b.created_at.localeCompare(a.created_at);
    });

    return arr;
  }, [tab, sort, pitchOn, deviceId]);

  return (
    <>
      <header className="px-5 pt-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      </header>

      <div className="mt-4 px-5">
        <ArchiveTabs active={tab} onChange={setTab} />
      </div>

      <div className="mt-3 flex items-center justify-between px-5">
        <PitchFilterChip active={pitchOn} onToggle={() => setPitchOn((v) => !v)} />
        <ArchiveSort active={sort} onChange={setSort} />
      </div>

      <ul className="mt-3">
        {sounds.length === 0 ? (
          <li className="px-5 py-16 text-center text-sm text-neutral-500">
            {tab === "mine" ? t("empty.mine") : t("empty.all")}
          </li>
        ) : (
          sounds.map((s) => (
            <li key={s.id}>
              <SoundCard sound={s} />
            </li>
          ))
        )}
      </ul>

      <UploadFab />
    </>
  );
}
