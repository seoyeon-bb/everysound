"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { LaunchpadGrid } from "@/components/launchpad/LaunchpadGrid";
import { RecordButton } from "@/components/launchpad/RecordButton";
import { MasterVolume } from "@/components/launchpad/MasterVolume";
import { PostMixModal } from "@/components/launchpad/PostMixModal";
import { useLaunchpad } from "@/hooks/useLaunchpad";
import { setMasterVolume, preload } from "@/lib/audio/engine";
import { LaunchpadCapture } from "@/lib/audio/launchpadCapture";
import { encodePcmStereoToMp3 } from "@/lib/audio/encoder";

const MAX_MS = 60_000;

export default function LaunchpadPage() {
  const t = useTranslations("launchpad");

  const [volume, setVolume] = useState(0.8);
  const [recording, setRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [mixBlob, setMixBlob] = useState<Blob | null>(null);
  const [mixDurationMs, setMixDurationMs] = useState(0);
  const [encoding, setEncoding] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);

  const startedAt = useRef<number | null>(null);
  const captureRef = useRef<LaunchpadCapture | null>(null);

  const { slots, loading, error } = useLaunchpad();

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
  }, []);

  useEffect(() => {
    setMasterVolume(volume);
  }, [volume]);

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
    setRecordError(null);
    const cap = new LaunchpadCapture();
    const ok = await cap.start();
    if (!ok) {
      setRecordError(t("recordSetupFailed"));
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
    } finally {
      setEncoding(false);
    }
  }

  const toggleRecord = () => {
    if (recording) {
      void finalizeRecording();
    } else {
      void startRecording();
    }
  };

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

      {recordError && (
        <div className="fixed bottom-24 left-1/2 z-50 max-w-[90%] -translate-x-1/2 rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-rose-500/30">
          {recordError}
        </div>
      )}

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

      {encoding && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <p className="rounded-full bg-neutral-900 px-4 py-2 text-sm text-neutral-200">
            {t("encoding")}
          </p>
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
