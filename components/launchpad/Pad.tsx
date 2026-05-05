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

const INNER_NO_INTERACT: React.CSSProperties = {
  ...NO_SELECT_STYLE,
  pointerEvents: "none",
};

const MAX_HOLD_MS = 30_000;

interface PadProps {
  position: number;
  sound: Sound | null;
  editMode: boolean;
  isDraggingThis: boolean;
  isHoverTarget: boolean;
  onRemove: () => void;
  onDragStart: () => void;
}

interface ActiveEntry {
  handle: PadHandle | null;
  cleanups: Array<() => void>;
  timeout: number;
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
  const activeRef = useRef<Map<number, ActiveEntry>>(new Map());

  useEffect(() => {
    const map = activeRef.current;
    return () => {
      map.forEach((entry) => {
        if (entry.handle) stopPadSustained(entry.handle);
        entry.cleanups.forEach((fn) => fn());
        clearTimeout(entry.timeout);
      });
      map.clear();
    };
  }, []);

  function releasePointer(pointerId: number) {
    const entry = activeRef.current.get(pointerId);
    if (!entry) return;
    if (entry.handle) {
      stopPadSustained(entry.handle);
      entry.handle = null;
    }
    entry.cleanups.forEach((fn) => fn());
    clearTimeout(entry.timeout);
    activeRef.current.delete(pointerId);
  }

  function attachReleaseListeners(pointerId: number, entry: ActiveEntry) {
    const onRelease = (ev: PointerEvent) => {
      if (ev.pointerId === pointerId) releasePointer(pointerId);
    };
    const onVisibility = () => {
      if (document.visibilityState !== "visible") releasePointer(pointerId);
    };
    const onBlur = () => releasePointer(pointerId);

    document.addEventListener("pointerup", onRelease);
    document.addEventListener("pointercancel", onRelease);
    window.addEventListener("pointerup", onRelease);
    window.addEventListener("pointercancel", onRelease);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);

    entry.cleanups.push(() => {
      document.removeEventListener("pointerup", onRelease);
      document.removeEventListener("pointercancel", onRelease);
      window.removeEventListener("pointerup", onRelease);
      window.removeEventListener("pointercancel", onRelease);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
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
    releasePointer(pointerId);

    const timeout = window.setTimeout(
      () => releasePointer(pointerId),
      MAX_HOLD_MS,
    );
    const entry: ActiveEntry = { handle: null, cleanups: [], timeout };
    activeRef.current.set(pointerId, entry);
    attachReleaseListeners(pointerId, entry);

    const handle = startPadSustained(sound.audio_key);
    if (handle) {
      entry.handle = handle;
      return;
    }

    void ensurePadReady(sound.audio_key).then(() => {
      const current = activeRef.current.get(pointerId);
      if (!current || current !== entry) return;
      const h = startPadSustained(sound!.audio_key!);
      if (!h) return;
      const stillActive = activeRef.current.get(pointerId);
      if (!stillActive || stillActive !== entry) {
        stopPadSustained(h);
        return;
      }
      entry.handle = h;
    });
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
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
      onPointerCancel={handlePointerUp}
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
        style={INNER_NO_INTERACT}
      >
        {filled ? (
          <span
            className="line-clamp-3 text-sm font-semibold leading-tight"
            style={INNER_NO_INTERACT}
            draggable={false}
          >
            {sound!.title}
          </span>
        ) : (
          <span style={INNER_NO_INTERACT}>{position + 1}</span>
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
