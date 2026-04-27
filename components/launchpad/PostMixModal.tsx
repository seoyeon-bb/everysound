"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useDeviceId } from "@/hooks/useDeviceId";

interface Props {
  blob: Blob;
  durationMs: number;
  onClose: () => void;
}

export function PostMixModal({ blob, durationMs, onClose }: Props) {
  const t = useTranslations("launchpad.postMix");
  const { deviceId, nickname } = useDeviceId();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadDone, setDownloadDone] = useState(false);
  const [shareDone, setShareDone] = useState(false);

  function handleDownload() {
    const url = URL.createObjectURL(blob);
    const stamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[T:]/g, "-");
    const a = document.createElement("a");
    a.href = url;
    a.download = `everysound-mix-${stamp}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloadDone(true);
  }

  async function handleShare() {
    if (!title.trim() || !summary.trim() || !deviceId) return;
    setSubmitting(true);
    setError(null);
    try {
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
          title: title.trim(),
          summary: summary.trim(),
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
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-t-2xl bg-neutral-900 p-5 pb-8 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-700" />
        <h2 className="text-lg font-bold">{t("title")}</h2>
        <p className="mt-1 text-xs text-neutral-500">
          {(durationMs / 1000).toFixed(1)}s · {(blob.size / 1024).toFixed(0)} KB
        </p>

        <audio
          src={URL.createObjectURL(blob)}
          controls
          className="mt-3 w-full"
        />

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
                disabled={submitting || !title.trim() || !summary.trim()}
                className={`mt-3 w-full rounded-xl py-2.5 text-sm font-semibold transition ${
                  submitting || !title.trim() || !summary.trim()
                    ? "cursor-not-allowed bg-neutral-800 text-neutral-600"
                    : "bg-emerald-500 text-neutral-950 active:scale-[0.98]"
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
