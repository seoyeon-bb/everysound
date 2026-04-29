"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, {
  type Region,
} from "wavesurfer.js/dist/plugins/regions.esm.js";
import { audioBufferToWavBlob, trimMonoFromBuffer } from "@/lib/audio/pcm";

const MAX_SEC = 3;

interface Props {
  buffer: AudioBuffer;
  onReset: () => void;
}

export interface TrimWidgetHandle {
  getCurrentTrim(): {
    samples: Float32Array;
    sampleRate: number;
    durationMs: number;
  };
}

export const TrimWidget = forwardRef<TrimWidgetHandle, Props>(
  function TrimWidget({ buffer, onReset }, ref) {
    const t = useTranslations("upload.trim");
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const regionRef = useRef<Region | null>(null);
    const selectionRef = useRef({ start: 0, end: Math.min(buffer.duration, MAX_SEC) });
    const [selStart, setSelStart] = useState(0);
    const [selEnd, setSelEnd] = useState(Math.min(buffer.duration, MAX_SEC));
    const [playing, setPlaying] = useState(false);

    useEffect(() => {
      if (!containerRef.current) return;

      const wavBlob = audioBufferToWavBlob(buffer);
      const url = URL.createObjectURL(wavBlob);

      const ws = WaveSurfer.create({
        container: containerRef.current,
        waveColor: "#525252",
        progressColor: "#a3a3a3",
        cursorColor: "#10b981",
        height: 72,
        barWidth: 2,
        barRadius: 1,
        url,
        interact: false,
      });
      const regions = ws.registerPlugin(RegionsPlugin.create());
      wavesurferRef.current = ws;

      ws.on("decode", () => {
        const dur = ws.getDuration();
        const initialEnd = Math.min(dur, MAX_SEC);
        const region = regions.addRegion({
          start: 0,
          end: initialEnd,
          color: "rgba(16, 185, 129, 0.25)",
          drag: true,
          resize: true,
        });
        regionRef.current = region;
        selectionRef.current = { start: 0, end: initialEnd };
        setSelStart(0);
        setSelEnd(initialEnd);

        region.on("update", () => {
          let s = Math.max(0, region.start);
          let e = Math.min(dur, region.end);
          if (e - s > MAX_SEC + 0.01) {
            e = s + MAX_SEC;
            region.setOptions({ start: s, end: e });
          }
          selectionRef.current = { start: s, end: e };
          setSelStart(s);
          setSelEnd(e);
        });
      });

      ws.on("play", () => setPlaying(true));
      ws.on("pause", () => setPlaying(false));
      ws.on("finish", () => setPlaying(false));

      return () => {
        ws.destroy();
        URL.revokeObjectURL(url);
      };
    }, [buffer]);

    useImperativeHandle(
      ref,
      () => ({
        getCurrentTrim: () => {
          const { start, end } = selectionRef.current;
          const samples = trimMonoFromBuffer(buffer, start, end);
          return {
            samples,
            sampleRate: buffer.sampleRate,
            durationMs: Math.round((end - start) * 1000),
          };
        },
      }),
      [buffer],
    );

    function playSelection() {
      const ws = wavesurferRef.current;
      if (!ws) return;
      if (playing) {
        ws.pause();
        return;
      }
      const { start, end } = selectionRef.current;
      ws.setTime(start);
      ws.play(start, end);
    }

    const selDuration = (selEnd - selStart).toFixed(1);

    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
        <div ref={containerRef} className="w-full" />
        <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
          <span className="font-mono tabular-nums">
            {selDuration}s / 3.0s
          </span>
          <button
            type="button"
            onClick={playSelection}
            className="rounded-full border border-neutral-700 px-3 py-1 text-xs text-neutral-200 transition hover:bg-neutral-800"
          >
            {playing ? t("pause") : t("play")}
          </button>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-neutral-500">
          {t("hint")}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-3 w-full rounded-full bg-neutral-800 py-2 text-sm font-medium text-neutral-200 transition hover:bg-neutral-700"
        >
          {t("reset")}
        </button>
      </div>
    );
  },
);
