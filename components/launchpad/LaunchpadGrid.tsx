"use client";

import { Pad } from "./Pad";
import type { LaunchpadSlot } from "@/hooks/useLaunchpad";

interface Props {
  slots: LaunchpadSlot[];
}

export function LaunchpadGrid({ slots }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2.5 md:grid-cols-4">
      {slots.map((slot) => (
        <Pad key={slot.position} position={slot.position} sound={slot.sound} />
      ))}
    </div>
  );
}
