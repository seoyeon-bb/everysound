"use client";

let stream: MediaStream | null = null;
let pending: Promise<MediaStream> | null = null;

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

export function releaseMicForceful(): void {
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}

export function hasLiveMic(): boolean {
  return stream !== null && isLive(stream);
}
