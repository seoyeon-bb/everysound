"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LaunchpadGrid } from "@/components/launchpad/LaunchpadGrid";
import { RecordButton } from "@/components/launchpad/RecordButton";
import { PostMixModal } from "@/components/launchpad/PostMixModal";
import {
  useLaunchpad,
  removeFromLaunchpad,
  swapLaunchpadPositions,
} from "@/hooks/useLaunchpad";
import { setMasterVolume, preload } from "@/lib/audio/engine";
import { LaunchpadCapture } from "@/lib/audio/launchpadCapture";
import { encodePcmStereoToMp3 } from "@/lib/audio/encoder";

const MAX_MS = 60_000;

export default function LaunchpadPage() {
  const t = useTranslations("launchpad");

  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [mixBlob, setMixBlob] = useState<Blob | null>(null);
  const [mixDurationMs, setMixDurationMs] = useState(0);
  const [encoding, setEncoding] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  const startedAt = useRef<number | null>(null);
  const captureRef = useRef<LaunchpadCapture | null>(null);

  const { slots, loading, error, refetch, deviceId } = useLaunchpad();

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevOverscroll = body.style.overscrollBehavior;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  useEffect(() => {
    LaunchpadCapture.ensureHowlerCtx();
    setMasterVolume(0.85);
  }, []);

  useEffect(() => {
    slots.forEach((s) => {
      if (s.sound?.audio_key) preload(s.sound.audio_key);
    });
  }, [slots]);

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
        finalizeRecording();
        return;
      }
      setElapsedMs(e);
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  useEffect(() => {
    return () => {
      captureRef.current?.cleanup();
    };
  }, []);

  async function startRecording() {
    if (editMode) return;
    setRecordError(null);
    const cap = new LaunchpadCapture();
    const ok = await cap.start();
    if (!ok) {
      setRecordError(t("recordSetupFailed"));
      window.setTimeout(() => setRecordError(null), 4000);
      return;
    }
    captureRef.current = cap;
    setElapsedMs(0);
    setRecording(true);
  }

  async function finalizeRecording() {
    setRecording(false);
    const cap = captureRef.current;
    if (!cap) return;
    const data = cap.stop();
    captureRef.current = null;
    if (!data || data.left.length === 0) {
      setRecordError(t("recordEmpty"));
      window.setTimeout(() => setRecordError(null), 4000);
      return;
    }

    setEncoding(true);
    const finalDur = Math.min(
      Math.round((data.left.length / data.sampleRate) * 1000),
      MAX_MS,
    );
    try {
      const blob = encodePcmStereoToMp3(data.left, data.right, data.sampleRate);
      setMixBlob(blob);
      setMixDurationMs(finalDur);
    } catch (e) {
      setRecordError(
        t("recordEncodeFailed", {
          message: e instanceof Error ? e.message : String(e),
        }),
      );
      window.setTimeout(() => setRecordError(null), 4000);
    } finally {
      setEncoding(false);
    }
  }

  const toggleRecord = () => {
    if (editMode) return;
    if (recording) {
      void finalizeRecording();
    } else {
      void startRecording();
    }
  };

  function handleLongPress() {
    if (recording) return;
    setEditMode(true);
  }

  async function handleRemove(position: number) {
    if (!deviceId) return;
    const r = await removeFromLaunchpad(deviceId, position);
    if (r.ok) {
      refetch();
    } else {
      setRecordError(t("removeFailed", { message: r.error }));
      window.setTimeout(() => setRecordError(null), 4000);
    }
  }

  async function handleSwap(from: number, to: number) {
    if (!deviceId) return;
    const r = await swapLaunchpadPositions(deviceId, from, to);
    if (r.ok) {
      refetch();
    } else {
      setRecordError(t("swapFailed", { message: r.error }));
      window.setTimeout(() => setRecordError(null), 4000);
    }
  }

  const occupied = slots.filter((s) => s.sound).length;

  return (
    <>
      <header className="flex items-center justify-between px-5 pt-6">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        {editMode ? (
          <button
            type="button"
            onClick={() => setEditMode(false)}
            className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-neutral-950 active:scale-95"
          >
            {t("editDone")}
          </button>
        ) : (
          <RecordButton
            recording={recording}
            elapsedMs={elapsedMs}
            onToggle={toggleRecord}
          />
        )}
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
            <LaunchpadGrid
              slots={slots}
              editMode={editMode}
              onLongPress={handleLongPress}
              onRemove={handleRemove}
              onSwap={handleSwap}
            />
          </>
        )}
      </div>

      <p className="mt-6 px-5 text-center text-xs text-neutral-500">
        {t("padCountHint", { occupied, total: 12 })}
      </p>

      {encoding && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <p className="rounded-full bg-neutral-900 px-4 py-2 text-sm text-neutral-200">
            {t("encoding")}
          </p>
        </div>
      )}

      {recordError && (
        <div className="fixed bottom-24 left-1/2 z-50 max-w-[90%] -translate-x-1/2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-rose-500/30">
          {recordError}
        </div>
      )}

      {mixBlob && (
        <PostMixModal
          blob={mixBlob}
          durationMs={mixDurationMs}
          onClose={() => {
            setMixBlob(null);
            setMixDurationMs(0);
          }}
        />
      )}
    </>
  );
}
