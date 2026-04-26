"use client";

import type { Sound } from "@/types/sound";

const PAD_COLORS = [
  "bg-rose-500/85 text-white",
  "bg-orange-500/85 text-white",
  "bg-amber-400/85 text-neutral-900",
  "bg-emerald-500/85 text-white",
  "bg-sky-500/85 text-white",
  "bg-violet-500/85 text-white",
  "bg-pink-500/85 text-white",
];

interface PadProps {
  position: number;
  sound: Sound | null;
  onTrigger?: () => void;
}

export function Pad({ position, sound, onTrigger }: PadProps) {
  if (!sound) {
    return (
      <div
        aria-label={`empty pad ${position + 1}`}
        className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 text-xs font-medium text-neutral-700"
      >
        {position + 1}
      </div>
    );
  }
  const color = PAD_COLORS[position % PAD_COLORS.length];
  return (
    <button
      type="button"
      onMouseDown={onTrigger}
      onTouchStart={(e) => {
        e.preventDefault();
        onTrigger?.();
      }}
      className={`flex aspect-square select-none flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center transition active:scale-95 ${color}`}
    >
      <span className="line-clamp-2 text-sm font-semibold leading-tight">
        {sound.title}
      </span>
      {sound.pitch && (
        <span className="text-[10px] font-medium opacity-80">{sound.pitch}</span>
      )}
    </button>
  );
}
