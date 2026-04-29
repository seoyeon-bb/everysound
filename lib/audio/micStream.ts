"use client";

const BUFFER_SIZE = 4096;

let stream: MediaStream | null = null;
let pending: Promise<MediaStream> | null = null;
let ctx: AudioContext | null = null;
let source: MediaStreamAudioSourceNode | null = null;
let processor: ScriptProcessorNode | null = null;
let muteGain: GainNode | null = null;

interface ActiveSession {
  samples: Float32Array[];
  active: boolean;
}
let session: ActiveSession | null = null;

function isLive(s: MediaStream): boolean {
  return s.getAudioTracks().some((t) => t.readyState === "live" && t.enabled);
}

async function acquireMic(): Promise<MediaStream> {
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

export async function setupRecordingChain(): Promise<AudioContext> {
  const s = await acquireMic();

  if (!ctx || ctx.state === "closed") {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new Ctx();
    source = null;
    processor = null;
    muteGain = null;
  }
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {}
  }

  if (!source) {
    source = ctx.createMediaStreamSource(s);
  }

  if (!processor) {
    processor = ctx.createScriptProcessor(BUFFER_SIZE, 1, 1);
    muteGain = ctx.createGain();
    muteGain.gain.value = 0;

    processor.onaudioprocess = (e) => {
      if (!session?.active) return;
      const input = e.inputBuffer.getChannelData(0);
      session.samples.push(new Float32Array(input));
    };

    source.connect(processor);
    processor.connect(muteGain);
    muteGain.connect(ctx.destination);
  }

  return ctx;
}

export function startSession(): void {
  session = { samples: [], active: true };
}

export function stopSession(): { samples: Float32Array; sampleRate: number } | null {
  if (!session) return null;
  const s = session;
  s.active = false;
  session = null;

  const totalLen = s.samples.reduce((sum, a) => sum + a.length, 0);
  if (totalLen === 0) return null;
  const merged = new Float32Array(totalLen);
  let offset = 0;
  for (const a of s.samples) {
    merged.set(a, offset);
    offset += a.length;
  }
  return { samples: merged, sampleRate: ctx?.sampleRate ?? 44100 };
}

export function abortSession(): void {
  session = null;
}

export function releaseMicForceful(): void {
  session = null;
  try {
    processor?.disconnect();
  } catch {}
  try {
    source?.disconnect();
  } catch {}
  try {
    muteGain?.disconnect();
  } catch {}
  processor = null;
  source = null;
  muteGain = null;
  if (ctx && ctx.state !== "closed") {
    try {
      void ctx.close();
    } catch {}
  }
  ctx = null;
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
}
