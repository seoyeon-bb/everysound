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

export async function encodeToMp3(input: Blob): Promise<Blob> {
  const ctx = new (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  try {
    const arrayBuffer = await input.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

    const channels = Math.min(2, audioBuffer.numberOfChannels);
    const sampleRate = audioBuffer.sampleRate;
    const left = floatTo16(audioBuffer.getChannelData(0));
    const right =
      channels > 1 ? floatTo16(audioBuffer.getChannelData(1)) : null;

    const encoder = new Mp3Encoder(channels, sampleRate, KBPS);
    const out: Uint8Array[] = [];

    for (let i = 0; i < left.length; i += FRAME) {
      const lc = left.subarray(i, i + FRAME);
      const buf =
        right !== null
          ? encoder.encodeBuffer(lc, right.subarray(i, i + FRAME))
          : encoder.encodeBuffer(lc);
      if (buf.length > 0) out.push(buf);
    }
    const tail = encoder.flush();
    if (tail.length > 0) out.push(tail);

    return new Blob(out as BlobPart[], { type: "audio/mpeg" });
  } finally {
    void ctx.close();
  }
}
