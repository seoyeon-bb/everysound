"use client";

import { Mp3Encoder } from "@breezystack/lamejs";

const FRAME = 1152;

function floatTo16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

export function normalizeRms(
  samples: Float32Array,
  targetRms = 0.18,
  maxGain = 8,
): Float32Array {
  if (samples.length === 0) return samples;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    sumSq += samples[i] * samples[i];
  }
  const currentRms = Math.sqrt(sumSq / samples.length);
  if (currentRms < 1e-5) return samples;

  const gain = Math.min(targetRms / currentRms, maxGain);
  if (Math.abs(gain - 1) < 0.05) return samples;

  const out = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i] * gain;
    out[i] = v > 1 ? 1 : v < -1 ? -1 : v;
  }
  return out;
}

export function encodePcmMonoToMp3(
  samples: Float32Array,
  sampleRate: number,
  kbps = 128,
): Blob {
  const samples16 = floatTo16(samples);
  const encoder = new Mp3Encoder(1, sampleRate, kbps);
  const out: Uint8Array[] = [];
  for (let i = 0; i < samples16.length; i += FRAME) {
    const buf = encoder.encodeBuffer(samples16.subarray(i, i + FRAME));
    if (buf.length > 0) out.push(buf);
  }
  const tail = encoder.flush();
  if (tail.length > 0) out.push(tail);
  return new Blob(out as BlobPart[], { type: "audio/mpeg" });
}

export function encodePcmStereoToMp3(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  kbps = 96,
): Blob {
  const left16 = floatTo16(left);
  const right16 = floatTo16(right);
  const encoder = new Mp3Encoder(2, sampleRate, kbps);
  const out: Uint8Array[] = [];
  const length = Math.min(left16.length, right16.length);
  for (let i = 0; i < length; i += FRAME) {
    const lc = left16.subarray(i, i + FRAME);
    const rc = right16.subarray(i, i + FRAME);
    const buf = encoder.encodeBuffer(lc, rc);
    if (buf.length > 0) out.push(buf);
  }
  const tail = encoder.flush();
  if (tail.length > 0) out.push(tail);
  return new Blob(out as BlobPart[], { type: "audio/mpeg" });
}
