"use client";

import { Howl, Howler } from "howler";

const cache = new Map<string, Howl>();

let audioSessionConfigured = false;
function configureAudioSession() {
  if (audioSessionConfigured) return;
  try {
    const session = (navigator as unknown as { audioSession?: { type: string } })
      .audioSession;
    if (session) {
      session.type = "playback";
      audioSessionConfigured = true;
    }
  } catch {}
}

function audioUrl(audioKey: string): string | null {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${encodeURI(audioKey)}`;
}

export function preload(audioKey: string): Howl | null {
  configureAudioSession();
  if (cache.has(audioKey)) return cache.get(audioKey)!;
  const url = audioUrl(audioKey);
  if (!url) return null;
  const howl = new Howl({
    src: [url],
    preload: true,
    html5: false,
  });
  cache.set(audioKey, howl);
  return howl;
}

export function play(audioKey: string | null | undefined): void {
  if (!audioKey) return;
  const howl = preload(audioKey);
  if (!howl) return;
  howl.play();
}

export function trigger(audioKey: string | null | undefined): void {
  if (!audioKey) return;
  const howl = preload(audioKey);
  if (!howl) return;
  howl.stop();
  howl.play();
}

export function stopAll(): void {
  cache.forEach((h) => h.stop());
}

export function setMasterVolume(value: number): void {
  Howler.volume(Math.max(0, Math.min(1, value)));
}

export function unlock(): void {
  configureAudioSession();
  const ctx = Howler.ctx;
  if (ctx && ctx.state === "suspended") {
    void ctx.resume();
  }
}
