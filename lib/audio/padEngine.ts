"use client";

import { Howl, Howler } from "howler";

const buffers = new Map<string, AudioBuffer>();
const rawData = new Map<string, ArrayBuffer>();
const inflight = new Map<string, Promise<void>>();
let unlocked = false;
let stateWatcherSet = false;

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
  const ctx = Howler.ctx ?? null;
  if (ctx) attachStateWatcher(ctx);
  return ctx;
}

function attachStateWatcher(ctx: AudioContext) {
  if (stateWatcherSet) return;
  stateWatcherSet = true;
  ctx.addEventListener("statechange", () => {
    if (ctx.state === "running") {
      for (const key of Array.from(rawData.keys())) {
        void decodeFromRaw(key);
      }
    }
  });
}

async function decodeFromRaw(audioKey: string): Promise<AudioBuffer | null> {
  if (buffers.has(audioKey)) return buffers.get(audioKey)!;
  const raw = rawData.get(audioKey);
  if (!raw) return null;
  const ctx = Howler.ctx;
  if (!ctx) return null;
  try {
    const audioBuffer = await ctx.decodeAudioData(raw.slice(0));
    buffers.set(audioKey, audioBuffer);
    rawData.delete(audioKey);
    return audioBuffer;
  } catch {
    return null;
  }
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
      let arr = rawData.get(audioKey);
      if (!arr) {
        const res = await fetch(url);
        if (!res.ok) return;
        arr = await res.arrayBuffer();
        rawData.set(audioKey, arr);
      }
      try {
        const audioBuffer = await ctx.decodeAudioData(arr.slice(0));
        buffers.set(audioKey, audioBuffer);
        rawData.delete(audioKey);
      } catch {
        // ctx may be suspended; rawData stays, retried on statechange
      }
    } catch {}
  })();
  inflight.set(audioKey, p);
  await p;
  inflight.delete(audioKey);
}

export async function ensurePadReady(audioKey: string): Promise<AudioBuffer | null> {
  if (buffers.has(audioKey)) return buffers.get(audioKey)!;
  await preloadPad(audioKey);
  if (buffers.has(audioKey)) return buffers.get(audioKey)!;
  return decodeFromRaw(audioKey);
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
