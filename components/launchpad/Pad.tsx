"use client";

import { useEffect, useRef } from "react";
import {
  startPadSustained,
  stopPadSustained,
  type PadHandle,
} from "@/lib/audio/padEngine";
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
  editMode: boolean;
  isDraggingThis: boolean;
  isHoverTarget: boolean;
  onRemove: () => void;
  onDragStart: () => void;
}

export function Pad({
  position,
  sound,
  editMode,
  isDraggingThis,
  isHoverTarget,
  onRemove,
  onDragStart,
}: PadProps) {
  const handleRef = useRef<PadHandle | null>(null);

  useEffect(() => {
    return () => {
      stopPadSustained(handleRef.current);
      handleRef.current = null;
    };
  }, []);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (editMode) {
      if (sound) {
        e.preventDefault();
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
        onDragStart();
      }
      return;
    }
    if (!sound?.audio_key) return;
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    stopPadSustained(handleRef.current);
    handleRef.current = startPadSustained(sound.audio_key);
  }

  function endSustain() {
    if (handleRef.current) {
      stopPadSustained(handleRef.current);
      handleRef.current = null;
    }
  }

  function handlePointerUp() {
    if (editMode) return;
    endSustain();
  }

  function handlePointerCancel() {
    endSustain();
  }

  const filled = sound !== null;
  const playable = Boolean(sound?.audio_key);
  const color = filled ? PAD_COLORS[position % PAD_COLORS.length] : "";

  let containerExtras = "transition-transform";
  if (editMode) {
    containerExtras += " select-none touch-none";
    if (isDraggingThis) containerExtras += " opacity-40 scale-95";
    else if (isHoverTarget) containerExtras += " ring-4 ring-emerald-400 scale-[1.03]";
    else if (filled) containerExtras += " animate-[pulse_1.6s_ease-in-out_infinite]";
  } else {
    containerExtras += " select-none touch-none";
  }

  return (
    <div
      data-pad-position={position}
      className={`relative aspect-square ${containerExtras}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <div
        className={`flex h-full w-full select-none items-center justify-center rounded-2xl px-2 py-2 text-center transition active:scale-95 ${
          filled
            ? playable
              ? color
              : "cursor-not-allowed bg-neutral-800/60 text-neutral-500"
            : "border border-dashed border-neutral-800 bg-neutral-900/40 text-xs font-medium text-neutral-700"
        }`}
      >
        {filled ? (
          <span className="line-clamp-3 text-sm font-semibold leading-tight">
            {sound!.title}
          </span>
        ) : (
          <span>{position + 1}</span>
        )}
      </div>

      {editMode && filled && !isDraggingThis && (
        <button
          type="button"
          aria-label="remove from launchpad"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute -right-1.5 -top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-950 text-neutral-100 ring-2 ring-neutral-900 transition hover:bg-neutral-800"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="h-3 w-3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
