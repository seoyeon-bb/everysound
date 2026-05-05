"use client";

import { Howl, Howler } from "howler";

const buffers = new Map<string, AudioBuffer>();
const rawData = new Map<string, ArrayBuffer>();
const fetching = new Map<string, Promise<void>>();

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

async function fetchRaw(audioKey: string): Promise<void> {
  if (rawData.has(audioKey)) return;
  if (fetching.has(audioKey)) {
    await fetching.get(audioKey);
    return;
  }
  const url = audioUrl(audioKey);
  if (!url) return;

  const p = (async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) return;
      const buf = await res.arrayBuffer();
      rawData.set(audioKey, buf);
    } catch {}
  })();
  fetching.set(audioKey, p);
  try {
    await p;
  } finally {
    fetching.delete(audioKey);
  }
}

export async function preloadPad(audioKey: string): Promise<void> {
  if (!audioKey || buffers.has(audioKey)) return;
  ensureCtx();
  await fetchRaw(audioKey);
}

export async function ensurePadReady(audioKey: string): Promise<AudioBuffer | null> {
  if (!audioKey) return null;
  if (buffers.has(audioKey)) return buffers.get(audioKey)!;

  const ctx = ensureCtx();
  if (!ctx) return null;

  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {}
  }

  if (!rawData.has(audioKey)) {
    await fetchRaw(audioKey);
  }
  const raw = rawData.get(audioKey);
  if (!raw) return null;

  try {
    const audioBuffer = await ctx.decodeAudioData(raw.slice(0));
    buffers.set(audioKey, audioBuffer);
    rawData.delete(audioKey);
    return audioBuffer;
  } catch {
    return null;
  }
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
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  const buffer = buffers.get(audioKey);
  const dest = destination();
  if (!buffer || !dest) {
    void ensurePadReady(audioKey);
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
