import type { ReactNode } from "react";

type ChipVariant = "default" | "category" | "pitch" | "tag";
type ChipSize = "sm" | "md";

interface ChipProps {
  children: ReactNode;
  variant?: ChipVariant;
  size?: ChipSize;
  className?: string;
}

const SIZE_CLASS: Record<ChipSize, string> = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
};

const VARIANT_CLASS: Record<ChipVariant, string> = {
  default: "bg-neutral-800 text-neutral-300",
  category: "bg-emerald-500/15 text-emerald-300",
  pitch: "bg-sky-500/15 text-sky-300",
  tag: "bg-neutral-800/70 text-neutral-400",
};

export function Chip({
  children,
  variant = "default",
  size = "sm",
  className = "",
}: ChipProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${SIZE_CLASS[size]} ${VARIANT_CLASS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
