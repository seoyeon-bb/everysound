"use client";

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export function MasterVolume({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-neutral-900/60 px-3 py-2">
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-4 w-4 text-neutral-400"
      >
        <path d="M3 10v4h4l5 5V5L7 10H3z" />
      </svg>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-800 accent-emerald-500"
      />
      <span className="w-8 text-right font-mono text-xs tabular-nums text-neutral-500">
        {Math.round(value * 100)}
      </span>
    </div>
  );
}
