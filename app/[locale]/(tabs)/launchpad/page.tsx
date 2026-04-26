"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LaunchpadGrid } from "@/components/launchpad/LaunchpadGrid";
import { RecordButton } from "@/components/launchpad/RecordButton";
import { MasterVolume } from "@/components/launchpad/MasterVolume";
import { useLaunchpad } from "@/hooks/useLaunchpad";

const MAX_MS = 60_000;

export default function LaunchpadPage() {
  const t = useTranslations("launchpad");

  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAt = useRef<number | null>(null);

  const { slots, loading, error } = useLaunchpad();

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

  const occupied = slots.filter((s) => s.sound).length;

  return (
    <>
      <header className="flex items-center justify-between px-5 pt-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            {t("padCount", { occupied, total: 12 })}
          </p>
        </div>
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
        {loading ? (
          <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-2xl bg-neutral-900/50"
              />
            ))}
          </div>
        ) : error ? (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {t("error", { message: error })}
          </p>
        ) : (
          <>
            {occupied === 0 && (
              <p className="mb-4 rounded-2xl border border-neutral-800 bg-neutral-900/40 px-4 py-3 text-center text-xs text-neutral-500">
                {t("emptyHint")}
              </p>
            )}
            <LaunchpadGrid slots={slots} />
          </>
        )}
      </div>

      <div className="mt-6 px-5">
        <MasterVolume value={volume} onChange={setVolume} />
      </div>
    </>
  );
}
