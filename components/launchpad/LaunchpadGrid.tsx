"use client";

import { Pad } from "./Pad";
import type { LaunchpadSlot } from "@/lib/mock/launchpad";

interface Props {
  slots: LaunchpadSlot[];
  onTrigger?: (slot: LaunchpadSlot) => void;
}

export function LaunchpadGrid({ slots, onTrigger }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4">
      {slots.map((slot) => (
        <Pad
          key={slot.position}
          position={slot.position}
          sound={slot.sound}
          onTrigger={() => onTrigger?.(slot)}
        />
      ))}
    </div>
  );
}
