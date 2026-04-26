"use client";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder }: Props) {
  return (
    <div className="relative">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-500"
      >
        <circle cx="11" cy="11" r="7" />
        <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-neutral-800 bg-neutral-900 py-2 pl-9 pr-9 text-sm text-neutral-100 placeholder:text-neutral-600 focus:border-emerald-500/50 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          aria-label="clear"
          onClick={() => onChange("")}
          className="absolute right-2 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
        >
          ×
        </button>
      )}
    </div>
  );
}
