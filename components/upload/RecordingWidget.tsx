"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import {
  blobToAudioBuffer,
  pcmToAudioBuffer,
  trimMonoFromBuffer,
} from "@/lib/audio/pcm";
import { normalizeRms } from "@/lib/audio/encoder";
import {
  setupRecordingChain,
  startSession,
  stopSession,
  abortSession,
} from "@/lib/audio/micStream";

const MAX_REC_MS = 5_000;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

type State = "ready" | "recording" | "paused";

interface Props {
  onCapture: (buffer: AudioBuffer) => void;
}

export function RecordingWidget({ onCapture }: Props) {
  const t = useTranslations("upload.record");
  const [state, setState] = useState<State>("ready");
  const [displayedMs, setDisplayedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const accMsRef = useRef(0);
  const segStartRef = useRef<number | null>(null);
  const tickerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
      abortSession();
    };
  }, []);

  function stopTicker() {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }

  function startTicker() {
    segStartRef.current = performance.now();
    if (tickerRef.current) clearInterval(tickerRef.current);
    tickerRef.current = window.setInterval(() => {
      const segStart = segStartRef.current;
      if (segStart == null) return;
      const elapsed = accMsRef.current + (performance.now() - segStart);
      if (elapsed >= MAX_REC_MS) {
        setDisplayedMs(MAX_REC_MS);
        stopTicker();
        complete();
        return;
      }
      setDisplayedMs(elapsed);
    }, 50) as unknown as number;
  }

  async function start() {
    setError(null);
    accMsRef.current = 0;
    setDisplayedMs(0);

    try {
      await setupRecordingChain();
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
        setError(t("micDeniedDetail"));
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError(t("micNotFound"));
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setError(t("micBusy"));
      } else {
        setError(t("micUnavailable"));
      }
      return;
    }

    startSession();
    setState("recording");
    startTicker();
  }

  function pause() {
    if (state !== "recording") return;
    const segStart = segStartRef.current;
    if (segStart != null) {
      accMsRef.current += performance.now() - segStart;
      segStartRef.current = null;
    }
    stopTicker();
    setDisplayedMs(accMsRef.current);
    setState("paused");
  }

  function resume() {
    if (state !== "paused") return;
    setState("recording");
    startTicker();
  }

  function complete() {
    if (state === "ready") return;
    const segStart = segStartRef.current;
    if (segStart != null) {
      accMsRef.current += performance.now() - segStart;
      segStartRef.current = null;
    }
    stopTicker();

    const result = stopSession();
    if (!result || result.samples.length === 0) {
      setError(t("empty"));
      setState("ready");
      return;
    }

    const maxSamples = Math.floor((MAX_REC_MS / 1000) * result.sampleRate);
    const samples =
      result.samples.length > maxSamples
        ? result.samples.subarray(0, maxSamples)
        : result.samples;

    const normalized = normalizeRms(samples);
    let buffer: AudioBuffer;
    try {
      buffer = pcmToAudioBuffer(normalized, result.sampleRate);
    } catch (e) {
      setError(
        t("encodeFailed", {
          message: e instanceof Error ? e.message : String(e),
        }),
      );
      setState("ready");
      return;
    }

    accMsRef.current = 0;
    setDisplayedMs(0);
    setState("ready");
    onCapture(buffer);
  }

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);

    if (file.size > MAX_FILE_BYTES) {
      setError(t("fileTooLarge"));
      return;
    }

    setBusy(true);
    try {
      const baseBuffer = await blobToAudioBuffer(file);
      const monoSamples = trimMonoFromBuffer(
        baseBuffer,
        0,
        baseBuffer.duration,
      );
      const normalized = normalizeRms(monoSamples);
      const buffer = pcmToAudioBuffer(normalized, baseBuffer.sampleRate);
      onCapture(buffer);
    } catch (err) {
      setError(
        t("decodeFailed", {
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    } finally {
      setBusy(false);
    }
  }

  const elapsedDisplay = (displayedMs / 1000).toFixed(1);
  const progressPct = Math.min(100, (displayedMs / MAX_REC_MS) * 100);

  function primaryAction() {
    if (state === "ready") return start();
    if (state === "recording") return pause();
    if (state === "paused") return resume();
  }

  const primaryLabel =
    state === "recording"
      ? t("pause")
      : state === "paused"
        ? t("resume")
        : t("start");
  const primaryStyle =
    state === "recording"
      ? "bg-neutral-800 text-neutral-100"
      : "bg-rose-500 text-white";

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
      {error && (
        <p className="mb-3 whitespace-pre-line rounded-lg bg-rose-500/10 px-3 py-2 text-xs leading-relaxed text-rose-300">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm tabular-nums text-rose-400">
            {elapsedDisplay} / {(MAX_REC_MS / 1000).toFixed(0)}.0s
          </span>
          {state === "recording" && (
            <span className="flex items-center gap-1.5 text-xs text-rose-400">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-rose-500" />
              {t("recording")}
            </span>
          )}
          {state === "paused" && (
            <span className="flex items-center gap-1.5 text-xs text-rose-400">
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500 opacity-40" />
              {t("paused")}
            </span>
          )}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
          <div
            className="h-full bg-rose-500 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={primaryAction}
            disabled={busy}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition active:scale-95 ${primaryStyle} ${busy ? "opacity-60" : ""}`}
          >
            {state === "recording" ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M6 5h4v14H6zm8 0h4v14h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={complete}
            disabled={state === "ready"}
            className={`flex flex-1 items-center justify-center rounded-xl py-3 text-sm font-semibold transition active:scale-95 ${
              state === "ready"
                ? "cursor-not-allowed bg-neutral-800 text-neutral-600"
                : "bg-emerald-500 text-neutral-950"
            }`}
          >
            {t("complete")}
          </button>
        </div>

        {state === "ready" && (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-700 px-3 py-2.5 text-xs text-neutral-400 transition hover:border-neutral-500 hover:text-neutral-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v12m0 0l-4-4m4 4l4-4M4 19h16" />
            </svg>
            {busy ? t("decoding") : t("uploadFile")}
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFile}
              disabled={busy}
            />
          </label>
        )}
      </div>
    </div>
  );
}
