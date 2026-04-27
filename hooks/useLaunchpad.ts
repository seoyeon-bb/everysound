"use client";

import { useCallback, useEffect, useState } from "react";
import { useDeviceId } from "@/hooks/useDeviceId";
import type { Sound } from "@/types/sound";

export interface LaunchpadSlot {
  position: number;
  sound: Sound | null;
}

interface State {
  slots: LaunchpadSlot[];
  loading: boolean;
  error: string | null;
}

const PADS = 12;
const empty: LaunchpadSlot[] = Array.from({ length: PADS }, (_, i) => ({
  position: i,
  sound: null,
}));

export function useLaunchpad() {
  const { deviceId, ready } = useDeviceId();
  const [state, setState] = useState<State>({ slots: empty, loading: true, error: null });

  const refetch = useCallback(async () => {
    if (!deviceId) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const r = await fetch("/api/launchpad", {
        headers: { "X-Device-Id": deviceId },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const { slots: rows } = (await r.json()) as {
        slots: { position: number; sound: Sound | null }[];
      };
      const filled: LaunchpadSlot[] = Array.from({ length: PADS }, (_, i) => {
        const found = rows.find((row) => row.position === i);
        return { position: i, sound: found?.sound ?? null };
      });
      setState({ slots: filled, loading: false, error: null });
    } catch (e) {
      setState({
        slots: empty,
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, [deviceId]);

  useEffect(() => {
    if (ready) refetch();
  }, [ready, refetch]);

  return { ...state, refetch, deviceId };
}

export async function addToLaunchpad(deviceId: string, soundId: string) {
  const r = await fetch("/api/launchpad", {
    method: "POST",
    headers: { "X-Device-Id": deviceId, "Content-Type": "application/json" },
    body: JSON.stringify({ sound_id: soundId }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    return { ok: false as const, error: data.error ?? `HTTP ${r.status}` };
  }
  return { ok: true as const, position: data.position as number };
}

export async function removeFromLaunchpad(deviceId: string, position: number) {
  const r = await fetch(`/api/launchpad?position=${position}`, {
    method: "DELETE",
    headers: { "X-Device-Id": deviceId },
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    return { ok: false as const, error: data.error ?? `HTTP ${r.status}` };
  }
  return { ok: true as const };
}

export async function swapLaunchpadPositions(
  deviceId: string,
  from: number,
  to: number,
) {
  const r = await fetch("/api/launchpad", {
    method: "PATCH",
    headers: { "X-Device-Id": deviceId, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to }),
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    return { ok: false as const, error: data.error ?? `HTTP ${r.status}` };
  }
  return { ok: true as const };
}
