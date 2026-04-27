"use client";

import { useEffect, useState } from "react";
import { Pad } from "./Pad";
import type { LaunchpadSlot } from "@/hooks/useLaunchpad";

interface Props {
  slots: LaunchpadSlot[];
  editMode: boolean;
  onLongPress: () => void;
  onRemove: (position: number) => void;
  onSwap: (from: number, to: number) => void;
}

export function LaunchpadGrid({
  slots,
  editMode,
  onLongPress,
  onRemove,
  onSwap,
}: Props) {
  const [draggingFrom, setDraggingFrom] = useState<number | null>(null);
  const [hoverTarget, setHoverTarget] = useState<number | null>(null);

  useEffect(() => {
    if (draggingFrom === null) return;

    function handleMove(e: PointerEvent) {
      const elem = document.elementFromPoint(e.clientX, e.clientY) as
        | HTMLElement
        | null;
      const padEl = elem?.closest(
        "[data-pad-position]",
      ) as HTMLElement | null;
      if (padEl) {
        const pos = Number(padEl.dataset.padPosition);
        setHoverTarget(pos === draggingFrom ? null : pos);
      } else {
        setHoverTarget(null);
      }
    }

    function handleUp() {
      const from = draggingFrom;
      const to = hoverTarget;
      if (from !== null && to !== null && from !== to) {
        onSwap(from, to);
      }
      setDraggingFrom(null);
      setHoverTarget(null);
    }

    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
    document.addEventListener("pointercancel", handleUp);
    return () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
      document.removeEventListener("pointercancel", handleUp);
    };
  }, [draggingFrom, hoverTarget, onSwap]);

  useEffect(() => {
    if (!editMode) {
      setDraggingFrom(null);
      setHoverTarget(null);
    }
  }, [editMode]);

  return (
    <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4">
      {slots.map((slot) => (
        <Pad
          key={slot.position}
          position={slot.position}
          sound={slot.sound}
          editMode={editMode}
          isDraggingThis={draggingFrom === slot.position}
          isHoverTarget={
            editMode && draggingFrom !== null && hoverTarget === slot.position
          }
          onLongPress={onLongPress}
          onRemove={() => onRemove(slot.position)}
          onDragStart={() => setDraggingFrom(slot.position)}
        />
      ))}
    </div>
  );
}
