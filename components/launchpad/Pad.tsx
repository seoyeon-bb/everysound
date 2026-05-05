"use client";

import { useEffect, useRef } from "react";
import {
  startPadSustained,
  stopPadSustained,
  ensurePadReady,
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

const NO_SELECT_STYLE: React.CSSProperties = {
  WebkitUserSelect: "none",
  userSelect: "none",
  WebkitTouchCallout: "none",
  WebkitTapHighlightColor: "transparent",
};

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
  const activeRef = useRef<Map<number, PadHandle>>(new Map());
  const pendingRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const map = activeRef.current;
    return () => {
      map.forEach((handle) => stopPadSustained(handle));
      map.clear();
      pendingRef.current.clear();
    };
  }, []);

  function releasePointer(pointerId: number) {
    pendingRef.current.delete(pointerId);
    const h = activeRef.current.get(pointerId);
    if (h) {
      stopPadSustained(h);
      activeRef.current.delete(pointerId);
    }
  }

  async function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (editMode) {
      if (sound) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {}
        onDragStart();
      }
      return;
    }
    if (!sound?.audio_key) return;

    const pointerId = e.pointerId;

    const prior = activeRef.current.get(pointerId);
    if (prior) {
      stopPadSustained(prior);
      activeRef.current.delete(pointerId);
    }

    try {
      e.currentTarget.setPointerCapture(pointerId);
    } catch {}

    pendingRef.current.add(pointerId);

    let handle = startPadSustained(sound.audio_key);
    if (!handle) {
      await ensurePadReady(sound.audio_key);
      if (!pendingRef.current.has(pointerId)) return;
      handle = startPadSustained(sound.audio_key);
      if (!handle) {
        pendingRef.current.delete(pointerId);
        return;
      }
    }

    if (!pendingRef.current.has(pointerId)) {
      stopPadSustained(handle);
      return;
    }
    pendingRef.current.delete(pointerId);
    activeRef.current.set(pointerId, handle);
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (editMode) return;
    releasePointer(e.pointerId);
  }

  function handlePointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    if (editMode) return;
    releasePointer(e.pointerId);
  }

  const filled = sound !== null;
  const playable = Boolean(sound?.audio_key);
  const color = filled ? PAD_COLORS[position % PAD_COLORS.length] : "";

  let containerExtras = "transition-transform select-none touch-none";
  if (editMode) {
    if (isDraggingThis) containerExtras += " opacity-40 scale-95";
    else if (isHoverTarget) containerExtras += " ring-4 ring-emerald-400 scale-[1.03]";
    else if (filled) containerExtras += " animate-[pulse_1.6s_ease-in-out_infinite]";
  }

  return (
    <div
      data-pad-position={position}
      className={`relative aspect-square ${containerExtras}`}
      style={NO_SELECT_STYLE}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className={`flex h-full w-full select-none items-center justify-center rounded-2xl px-2 py-2 text-center transition active:scale-95 ${
          filled
            ? playable
              ? color
              : "cursor-not-allowed bg-neutral-800/60 text-neutral-500"
            : "border border-dashed border-neutral-800 bg-neutral-900/40 text-xs font-medium text-neutral-700"
        }`}
        style={NO_SELECT_STYLE}
      >
        {filled ? (
          <span
            className="line-clamp-3 text-sm font-semibold leading-tight"
            style={NO_SELECT_STYLE}
            draggable={false}
          >
            {sound!.title}
          </span>
        ) : (
          <span style={NO_SELECT_STYLE}>{position + 1}</span>
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
