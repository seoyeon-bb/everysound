"use client";

import { useState, type KeyboardEvent } from "react";

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  max: number;
  placeholder?: string;
}

export function TagInput({ value, onChange, max, placeholder }: Props) {
  const [input, setInput] = useState("");

  function commit() {
    const t = input.trim().replace(/^#+/, "");
    setInput("");
    if (!t || value.includes(t) || value.length >= max) return;
    onChange([...value, t.slice(0, 16)]);
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5 focus-within:border-emerald-500/50">
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-neutral-800 py-0.5 pl-2 pr-1 text-xs text-neutral-200"
          >
            #{t}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== t))}
              className="flex h-4 w-4 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-700 hover:text-neutral-300"
            >
              ×
            </button>
          </span>
        ))}
        {value.length < max && (
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            onBlur={commit}
            placeholder={value.length === 0 ? placeholder : ""}
            className="min-w-[6rem] flex-1 bg-transparent py-1 text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
          />
        )}
      </div>
    </div>
  );
}
