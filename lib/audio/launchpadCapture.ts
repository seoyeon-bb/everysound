"use client";

import { Howler, Howl } from "howler";

export class LaunchpadCapture {
  private tap: ScriptProcessorNode | null = null;
  private muteGain: GainNode | null = null;
  private samplesL: Float32Array[] = [];
  private samplesR: Float32Array[] = [];
  private isCapturing = false;

  static ensureHowlerCtx(): AudioContext | null {
    if (!Howler.ctx) {
      try {
        new Howl({ src: ["data:audio/mpeg;base64,"], preload: false, volume: 0 });
      } catch {}
    }
    return Howler.ctx ?? null;
  }

  async start(): Promise<boolean> {
    const ctx = LaunchpadCapture.ensureHowlerCtx();
    const masterGain = (Howler as unknown as { masterGain?: GainNode }).masterGain;
    if (!ctx || !masterGain) return false;

    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }

    const tap = ctx.createScriptProcessor(16384, 2, 2);
    this.samplesL = [];
    this.samplesR = [];
    this.isCapturing = true;

    tap.onaudioprocess = (e) => {
      if (!this.isCapturing) return;
      this.samplesL.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      this.samplesR.push(new Float32Array(e.inputBuffer.getChannelData(1)));
    };

    masterGain.connect(tap);

    const muteGain = ctx.createGain();
    muteGain.gain.value = 0;
    tap.connect(muteGain);
    muteGain.connect(ctx.destination);

    this.tap = tap;
    this.muteGain = muteGain;
    return true;
  }

  stop(): { left: Float32Array; right: Float32Array; sampleRate: number } | null {
    const ctx = Howler.ctx;
    const masterGain = (Howler as unknown as { masterGain?: GainNode }).masterGain;
    if (!ctx) return null;

    this.isCapturing = false;
    try {
      if (this.tap && masterGain) masterGain.disconnect(this.tap);
    } catch {}
    try {
      this.tap?.disconnect();
    } catch {}
    try {
      this.muteGain?.disconnect();
    } catch {}
    this.tap = null;
    this.muteGain = null;

    const totalLen = this.samplesL.reduce((s, a) => s + a.length, 0);
    const left = new Float32Array(totalLen);
    const right = new Float32Array(totalLen);
    let offset = 0;
    for (let i = 0; i < this.samplesL.length; i++) {
      left.set(this.samplesL[i], offset);
      right.set(this.samplesR[i], offset);
      offset += this.samplesL[i].length;
    }
    this.samplesL = [];
    this.samplesR = [];

    return { left, right, sampleRate: ctx.sampleRate };
  }

  cleanup() {
    const masterGain = (Howler as unknown as { masterGain?: GainNode }).masterGain;
    this.isCapturing = false;
    try {
      if (this.tap && masterGain) masterGain.disconnect(this.tap);
    } catch {}
    try {
      this.tap?.disconnect();
    } catch {}
    try {
      this.muteGain?.disconnect();
    } catch {}
    this.tap = null;
    this.muteGain = null;
    this.samplesL = [];
    this.samplesR = [];
  }
}
