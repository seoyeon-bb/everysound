"use client";

import { trigger } from "@/lib/audio/engine";
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
}

export function Pad({ position, sound }: PadProps) {
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
  const playable = Boolean(sound.audio_key);

  return (
    <button
      type="button"
      disabled={!playable}
      onMouseDown={() => trigger(sound.audio_key)}
      onTouchStart={(e) => {
        e.preventDefault();
        trigger(sound.audio_key);
      }}
      className={`flex aspect-square select-none items-center justify-center rounded-2xl px-2 py-2 text-center transition active:scale-95 ${
        playable ? color : "cursor-not-allowed bg-neutral-800/60 text-neutral-500"
      }`}
    >
      <span className="line-clamp-3 text-sm font-semibold leading-tight">
        {sound.title}
      </span>
    </button>
  );
}
