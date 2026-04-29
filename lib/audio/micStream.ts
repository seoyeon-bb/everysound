"use client";

let stream: MediaStream | null = null;
let pending: Promise<MediaStream> | null = null;
let ctx: AudioContext | null = null;

function isLive(s: MediaStream): boolean {
  return s.getAudioTracks().some((t) => t.readyState === "live" && t.enabled);
}

export async function acquireMic(): Promise<MediaStream> {
  if (stream && isLive(stream)) return stream;

  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }

  if (pending) return pending;

  pending = navigator.mediaDevices
    .getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    })
    .then((s) => {
      stream = s;
      pending = null;
      return s;
    })
    .catch((e) => {
      pending = null;
      throw e;
    });

  return pending;
}

export function acquireRecCtx(): AudioContext {
  if (!ctx || ctx.state === "closed") {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new Ctx();
  }
  return ctx;
}

export async function ensureRecCtxRunning(): Promise<AudioContext> {
  const c = acquireRecCtx();
  if (c.state === "suspended") {
    try {
      await c.resume();
    } catch {}
  }
  return c;
}

export function releaseMicForceful(): void {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  if (ctx && ctx.state !== "closed") {
    try {
      void ctx.close();
    } catch {}
  }
  ctx = null;
}

export function hasLiveMic(): boolean {
  return stream !== null && isLive(stream);
}
