"use client";

import { useTranslations } from "next-intl";
import type { StageRecording } from "@/types/sound";

function fmtDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
}

interface Props {
  recording: StageRecording;
  liked?: boolean;
  onPlay?: () => void;
  onToggleLike?: () => void;
}

export function StageCard({ recording, liked = false, onPlay, onToggleLike }: Props) {
  const t = useTranslations("stage");

  return (
    <article className="border-b border-neutral-900 px-5 py-4">
      <div className="flex gap-3">
        <button
          type="button"
          aria-label={t("actions.play")}
          onClick={onPlay}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-neutral-950 transition active:scale-95"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 h-5 w-5">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-neutral-100">
            {recording.title}
          </h3>
          <p className="line-clamp-1 text-sm text-neutral-400">{recording.summary}</p>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-neutral-500">
            <span>{recording.uploader_nickname ?? t("anonymous")}</span>
            <span>·</span>
            <span className="font-mono tabular-nums">
              {recording.duration_ms ? fmtDuration(recording.duration_ms) : "--:--"}
            </span>
            <span>·</span>
            <span>{t("meta.plays", { count: recording.play_count })}</span>
          </div>
        </div>
        <button
          type="button"
          aria-label={t("actions.like")}
          onClick={onToggleLike}
          className={`flex shrink-0 flex-col items-center gap-0.5 transition ${
            liked ? "text-rose-400" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill={liked ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            className="h-5 w-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
          <span className="text-[11px] font-medium tabular-nums">
            {recording.like_count}
          </span>
        </button>
      </div>
    </article>
  );
}
