"use client";

import { Howl, Howler } from "howler";

const buffers = new Map<string, AudioBuffer>();
const inflight = new Map<string, Promise<AudioBuffer | null>>();
let unlocked = false;

function unlockSync(ctx: AudioContext): void {
  if (unlocked) return;
  unlocked = true;
  try {
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {}
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
}

function audioUrl(audioKey: string): string | null {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${encodeURI(audioKey)}`;
}

function ensureCtx(): AudioContext | null {
  if (!Howler.ctx) {
    try {
      new Howl({ src: ["data:audio/mpeg;base64,"], preload: false, volume: 0 });
    } catch {}
  }
  return Howler.ctx ?? null;
}

function destination(): AudioNode | null {
  const ctx = Howler.ctx;
  if (!ctx) return null;
  const master = (Howler as unknown as { masterGain?: GainNode }).masterGain;
  return master ?? ctx.destination;
}

export async function preloadPad(audioKey: string): Promise<void> {
  if (!audioKey || buffers.has(audioKey)) return;
  if (inflight.has(audioKey)) {
    await inflight.get(audioKey);
    return;
  }
  const ctx = ensureCtx();
  if (!ctx) return;
  const url = audioUrl(audioKey);
  if (!url) return;

  const p = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const arrBuf = await res.arrayBuffer();
      const buffer = await ctx.decodeAudioData(arrBuf.slice(0));
      buffers.set(audioKey, buffer);
      return buffer;
    } catch {
      return null;
    }
  })();
  inflight.set(audioKey, p);
  await p;
  inflight.delete(audioKey);
}

export interface PadHandle {
  source: AudioBufferSourceNode;
}

export function startPadSustained(
  audioKey: string | null | undefined,
): PadHandle | null {
  if (!audioKey) return null;
  const ctx = Howler.ctx;
  if (!ctx) return null;
  unlockSync(ctx);
  const buffer = buffers.get(audioKey);
  const dest = destination();
  if (!buffer || !dest) {
    void preloadPad(audioKey);
    return null;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(dest);
  source.start();
  return { source };
}

export function stopPadSustained(handle: PadHandle | null | undefined): void {
  if (!handle) return;
  try {
    handle.source.stop();
  } catch {}
  try {
    handle.source.disconnect();
  } catch {}
}
