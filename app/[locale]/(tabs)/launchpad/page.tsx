"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LaunchpadGrid } from "@/components/launchpad/LaunchpadGrid";
import { RecordButton } from "@/components/launchpad/RecordButton";
import { MasterVolume } from "@/components/launchpad/MasterVolume";
import { MOCK_LAUNCHPAD } from "@/lib/mock/launchpad";

const MAX_MS = 60_000;

export default function LaunchpadPage() {
  const t = useTranslations("launchpad");

  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!recording) {
      startedAt.current = null;
      return;
    }
    startedAt.current = performance.now();
    const id = setInterval(() => {
      if (startedAt.current == null) return;
      const e = performance.now() - startedAt.current;
      if (e >= MAX_MS) {
        setElapsedMs(MAX_MS);
        setRecording(false);
        return;
      }
      setElapsedMs(e);
    }, 100);
    return () => clearInterval(id);
  }, [recording]);

  const toggleRecord = () => {
    if (recording) {
      setRecording(false);
    } else {
      setElapsedMs(0);
      setRecording(true);
    }
  };

  if (!audioUnlocked) {
    return (
      <section className="flex min-h-[70vh] flex-col items-center justify-center px-5 text-center">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="mt-2 max-w-xs text-sm text-neutral-500">
          {t("record.limitNotice")}
        </p>
        <button
          type="button"
          onClick={() => setAudioUnlocked(true)}
          className="mt-8 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-neutral-950 transition active:scale-95"
        >
          {t("tapToStart")}
        </button>
      </section>
    );
  }

  return (
    <>
      <header className="flex items-center justify-between px-5 pt-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <RecordButton
          recording={recording}
          elapsedMs={elapsedMs}
          onToggle={toggleRecord}
        />
      </header>

      <p className="mt-2 px-5 text-[11px] leading-snug text-neutral-500">
        {t("record.limitNotice")}
      </p>

      <div className="mt-5 px-5">
        <LaunchpadGrid slots={MOCK_LAUNCHPAD} />
      </div>

      <div className="mt-6 px-5">
        <MasterVolume value={volume} onChange={setVolume} />
      </div>
    </>
  );
}
