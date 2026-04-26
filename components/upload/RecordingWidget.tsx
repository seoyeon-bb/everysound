"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const MAX_MS = 3000;

type State = "ready" | "recording" | "paused" | "done";

interface Props {
  onChange: (blob: Blob | null, durationMs: number) => void;
}

export function RecordingWidget({ onChange }: Props) {
  const t = useTranslations("upload.record");
  const [state, setState] = useState<State>("ready");
  const [displayedMs, setDisplayedMs] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const accMsRef = useRef(0);
  const segStartRef = useRef<number | null>(null);
  const tickerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {}
      }
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      if (tickerRef.current) clearInterval(tickerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

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
      setDisplayedMs(elapsed);
      if (elapsed >= MAX_MS) complete();
    }, 50) as unknown as number;
  }

  async function start() {
    setError(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    onChange(null, 0);
    accMsRef.current = 0;
    setDisplayedMs(0);
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(t("micDenied"));
      return;
    }
    streamRef.current = stream;

    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      const finalDur = Math.min(accMsRef.current, MAX_MS);
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
      stopTicker();
      setState("done");
      onChange(blob, finalDur);
    };
    recorderRef.current = rec;

    rec.start();
    setState("recording");
    startTicker();
  }

  function pause() {
    const rec = recorderRef.current;
    if (!rec || rec.state !== "recording") return;
    rec.pause();
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
    const rec = recorderRef.current;
    if (!rec || rec.state !== "paused") return;
    rec.resume();
    setState("recording");
    startTicker();
  }

  function complete() {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") return;
    const segStart = segStartRef.current;
    if (segStart != null) {
      accMsRef.current += performance.now() - segStart;
      segStartRef.current = null;
    }
    stopTicker();
    rec.stop();
  }

  function reset() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    accMsRef.current = 0;
    setDisplayedMs(0);
    chunksRef.current = [];
    setError(null);
    onChange(null, 0);
    setState("ready");
  }

  const elapsedDisplay = (displayedMs / 1000).toFixed(1);
  const progressPct = Math.min(100, (displayedMs / MAX_MS) * 100);

  function primaryAction() {
    if (state === "ready") return start();
    if (state === "recording") return pause();
    if (state === "paused") return resume();
  }

  const primaryLabel =
    state === "recording" ? t("pause") : state === "paused" ? t("resume") : t("start");
  const primaryStyle =
    state === "recording"
      ? "bg-neutral-800 text-neutral-100"
      : "bg-rose-500 text-white";

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
      {error && (
        <p className="mb-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      {state !== "done" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm tabular-nums text-rose-400">
              {elapsedDisplay} / 3.0s
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
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition active:scale-95 ${primaryStyle}`}
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
        </div>
      ) : (
        <div className="space-y-2">
          {audioUrl && <audio src={audioUrl} controls className="w-full" />}
          <button
            type="button"
            onClick={reset}
            className="w-full rounded-full bg-neutral-800 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-700"
          >
            {t("retry")}
          </button>
        </div>
      )}
    </div>
  );
}
