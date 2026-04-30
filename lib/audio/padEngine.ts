"use client";

import { Howl, Howler } from "howler";

const howls = new Map<string, Howl>();
const loading = new Map<string, Promise<Howl | null>>();

function audioUrl(audioKey: string): string | null {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${encodeURI(audioKey)}`;
}

export async function preloadPad(audioKey: string): Promise<void> {
  if (!audioKey || howls.has(audioKey)) return;
  if (loading.has(audioKey)) {
    await loading.get(audioKey);
    return;
  }
  const url = audioUrl(audioKey);
  if (!url) return;

  const p = new Promise<Howl | null>((resolve) => {
    const howl = new Howl({
      src: [url],
      preload: true,
      html5: false,
      loop: true,
      onload: () => {
        howls.set(audioKey, howl);
        resolve(howl);
      },
      onloaderror: () => {
        resolve(null);
      },
    });
  });
  loading.set(audioKey, p);
  await p;
  loading.delete(audioKey);
}

export async function ensurePadReady(audioKey: string): Promise<Howl | null> {
  if (howls.has(audioKey)) return howls.get(audioKey)!;
  await preloadPad(audioKey);
  return howls.get(audioKey) ?? null;
}

export interface PadHandle {
  howl: Howl;
  id: number;
}

export function startPadSustained(
  audioKey: string | null | undefined,
): PadHandle | null {
  if (!audioKey) return null;

  const ctx = Howler.ctx;
  if (ctx && ctx.state === "suspended") {
    void ctx.resume();
  }

  const howl = howls.get(audioKey);
  if (!howl) {
    void ensurePadReady(audioKey);
    return null;
  }
  const id = howl.play();
  howl.loop(true, id);
  return { howl, id };
}

export function stopPadSustained(handle: PadHandle | null | undefined): void {
  if (!handle) return;
  try {
    handle.howl.stop(handle.id);
  } catch {}
}
