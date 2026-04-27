"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useDeviceId } from "@/hooks/useDeviceId";

interface Props {
  blob: Blob;
  durationMs: number;
  onClose: () => void;
}

const DISMISS_THRESHOLD = 100;

export function PostMixModal({ blob, durationMs, onClose }: Props) {
  const t = useTranslations("launchpad.postMix");
  const { deviceId, nickname } = useDeviceId();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadDone, setDownloadDone] = useState(false);
  const [shareDone, setShareDone] = useState(false);

  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef<number | null>(null);

  const audioSrc = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(audioSrc), [audioSrc]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    if (!dragging) return;

    function handleMove(e: PointerEvent) {
      if (startYRef.current === null) return;
      const delta = e.clientY - startYRef.current;
      if (delta > 0) setDragOffset(delta);
    }

    function handleUp() {
      setDragging(false);
      startYRef.current = null;
      setDragOffset((current) => {
        if (current > DISMISS_THRESHOLD) {
          onClose();
          return current;
        }
        return 0;
      });
    }

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    document.addEventListener("pointercancel", handleUp);
    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      document.removeEventListener("pointercancel", handleUp);
    };
  }, [dragging, onClose]);

  function handleHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    startYRef.current = e.clientY;
    setDragging(true);
  }

  function handleDownload() {
    const stamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[T:]/g, "-");
    const a = document.createElement("a");
    a.href = audioSrc;
    a.download = `everysound-mix-${stamp}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setDownloadDone(true);
  }

  async function handleShare() {
    setSubmitting(true);
    setError(null);
    try {
      if (!deviceId) {
        throw new Error("device_id not ready, please retry in a moment");
      }
      const t1 = title.trim();
      const s1 = summary.trim();
      if (!t1 || !s1) {
        throw new Error("title and summary required");
      }

      const recId = crypto.randomUUID();
      const fileName = `${recId}.mp3`;

      const r1 = await fetch("/api/stage/upload-url", {
        method: "POST",
        headers: {
          "X-Device-Id": deviceId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName,
          contentType: "audio/mpeg",
          contentLength: blob.size,
        }),
      });
      if (!r1.ok) {
        const e = await r1.json().catch(() => ({}));
        throw new Error(e.error ?? `presign HTTP ${r1.status}`);
      }
      const { url, key } = (await r1.json()) as { url: string; key: string };

      const r2 = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "audio/mpeg" },
        body: blob,
      });
      if (!r2.ok) throw new Error(`upload HTTP ${r2.status}`);

      const r3 = await fetch("/api/stage", {
        method: "POST",
        headers: {
          "X-Device-Id": deviceId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: recId,
          title: t1,
          summary: s1,
          audio_key: key,
          duration_ms: Math.round(durationMs),
          uploader_nickname: nickname || null,
        }),
      });
      if (!r3.ok) {
        const e = await r3.json().catch(() => ({}));
        throw new Error(e.error ?? `insert HTTP ${r3.status}`);
      }

      setShareDone(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[PostMixModal.handleShare]", e);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const canShare = !submitting && deviceId && title.trim() && summary.trim();
  const sheetStyle = {
    transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
    transition: dragging ? "none" : "transform 0.2s ease-out",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={sheetStyle}
        className="w-full max-w-md rounded-t-2xl bg-neutral-900 p-5 pb-8 shadow-2xl"
      >
        <div
          onPointerDown={handleHandlePointerDown}
          className="-mt-3 mb-3 flex h-6 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
        >
          <div className="h-1 w-10 rounded-full bg-neutral-700" />
        </div>

        <h2 className="text-lg font-bold">{t("title")}</h2>
        <p className="mt-1 text-xs text-neutral-500">
          {(durationMs / 1000).toFixed(1)}s · {(blob.size / 1024).toFixed(0)} KB
        </p>

        <audio src={audioSrc} controls className="mt-3 w-full" />

        {error && (
          <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </p>
        )}

        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={handleDownload}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
              downloadDone
                ? "bg-neutral-800 text-neutral-500"
                : "bg-neutral-800 text-neutral-100 hover:bg-neutral-700 active:scale-[0.98]"
            }`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v12m0 0l-4-4m4 4l4-4M4 19h16" />
            </svg>
            {downloadDone ? t("downloaded") : t("download")}
          </button>

          {shareDone ? (
            <p className="rounded-lg bg-emerald-500/10 px-3 py-3 text-center text-sm text-emerald-300">
              {t("shared")}
            </p>
          ) : (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3">
              <p className="text-xs font-semibold text-neutral-300">
                {t("shareSection")}
              </p>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("placeholders.title")}
                maxLength={40}
                className="mt-2 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-base text-neutral-100 placeholder:text-neutral-600 focus:border-emerald-500/50 focus:outline-none"
              />
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={t("placeholders.summary")}
                maxLength={80}
                className="mt-2 w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-base text-neutral-100 placeholder:text-neutral-600 focus:border-emerald-500/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleShare}
                disabled={!canShare}
                className={`mt-3 w-full rounded-xl py-2.5 text-sm font-semibold transition ${
                  canShare
                    ? "bg-emerald-500 text-neutral-950 active:scale-[0.98]"
                    : "cursor-not-allowed bg-neutral-800 text-neutral-600"
                }`}
              >
                {submitting ? t("uploading") : t("share")}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-sm text-neutral-400 hover:text-neutral-200"
          >
            {t("close")}
          </button>
        </div>
      </div>
    </div>
  );
}
