"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const MAX_MS = 3000;

interface Props {
  onChange: (blob: Blob | null, durationMs: number) => void;
}

export function RecordingWidget({ onChange }: Props) {
  const t = useTranslations("upload.record");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAt = useRef(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function startRecording() {
    setError(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    onChange(null, 0);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setError(t("micDenied"));
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];

    const recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
      const durationMs = Math.min(
        Math.round(performance.now() - startedAt.current),
        MAX_MS,
      );
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      stream.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
      setRecording(false);
      onChange(blob, durationMs);
    };
    recorderRef.current = recorder;

    startedAt.current = performance.now();
    recorder.start();
    setRecording(true);
    setElapsed(0);

    timerRef.current = window.setInterval(() => {
      const e = performance.now() - startedAt.current;
      if (e >= MAX_MS) {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
        if (timerRef.current) clearInterval(timerRef.current);
        setElapsed(MAX_MS);
        return;
      }
      setElapsed(e);
    }, 50) as unknown as number;
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
      {error && (
        <p className="mb-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {error}
        </p>
      )}

      {!recording && !audioUrl && (
        <button
          type="button"
          onClick={startRecording}
          className="flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-rose-500 text-base font-semibold text-white transition active:scale-95"
        >
          <span className="h-3 w-3 rounded-full bg-white/90" />
          {t("start")}
        </button>
      )}

      {recording && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-sm tabular-nums text-rose-400">
              {(elapsed / 1000).toFixed(1)} / 3.0s
            </span>
            <button
              type="button"
              onClick={stopRecording}
              className="text-xs text-neutral-400 hover:text-neutral-200"
            >
              {t("stop")}
            </button>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
            <div
              className="h-full bg-rose-500 transition-all"
              style={{ width: `${(elapsed / MAX_MS) * 100}%` }}
            />
          </div>
        </div>
      )}

      {audioUrl && !recording && (
        <div className="space-y-2">
          <audio src={audioUrl} controls className="w-full" />
          <button
            type="button"
            onClick={startRecording}
            className="w-full rounded-full bg-neutral-800 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-700"
          >
            {t("retry")}
          </button>
        </div>
      )}
    </div>
  );
}
