"use client";

import { useTranslations } from "next-intl";

const MAX_MS = 60_000;

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm.toString().padStart(2, "0")}:${ss.toString().padStart(2, "0")}`;
}

interface Props {
  recording: boolean;
  elapsedMs: number;
  onToggle: () => void;
}

export function RecordButton({ recording, elapsedMs, onToggle }: Props) {
  const t = useTranslations("launchpad.record");
  return (
    <div className="flex items-center gap-2">
      {recording && (
        <span className="font-mono text-xs tabular-nums text-rose-400">
          {fmt(elapsedMs)} / {fmt(MAX_MS)}
        </span>
      )}
      <button
        type="button"
        aria-label={recording ? t("stop") : t("start")}
        onClick={onToggle}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95 ${
          recording
            ? "bg-rose-500 text-white"
            : "bg-emerald-500 text-neutral-950"
        }`}
      >
        {recording ? (
          <span className="h-3 w-3 rounded-[2px] bg-white" />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="ml-0.5 h-5 w-5"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}
