import type { Sound } from "@/types/sound";
import { MOCK_SOUNDS } from "./sounds";

export interface LaunchpadSlot {
  position: number;
  sound: Sound | null;
}

const FILLED: Array<[number, string]> = [
  [0, "mock-6"],
  [1, "mock-3"],
  [2, "mock-9"],
  [4, "mock-1"],
  [5, "mock-5"],
  [7, "mock-12"],
  [10, "mock-8"],
];

export const MOCK_LAUNCHPAD: LaunchpadSlot[] = Array.from(
  { length: 12 },
  (_, i) => {
    const found = FILLED.find(([pos]) => pos === i);
    const sound = found
      ? (MOCK_SOUNDS.find((s) => s.id === found[1]) ?? null)
      : null;
    return { position: i, sound };
  },
);
