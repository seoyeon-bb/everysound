"use client";

import { Mp3Encoder } from "@breezystack/lamejs";

const KBPS = 96;
const FRAME = 1152;

function floatTo16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

export function encodePcmMonoToMp3(
  samples: Float32Array,
  sampleRate: number,
): Blob {
  const samples16 = floatTo16(samples);
  const encoder = new Mp3Encoder(1, sampleRate, KBPS);
  const out: Uint8Array[] = [];
  for (let i = 0; i < samples16.length; i += FRAME) {
    const buf = encoder.encodeBuffer(samples16.subarray(i, i + FRAME));
    if (buf.length > 0) out.push(buf);
  }
  const tail = encoder.flush();
  if (tail.length > 0) out.push(tail);
  return new Blob(out as BlobPart[], { type: "audio/mpeg" });
}
