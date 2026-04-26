"use client";

import { useEffect } from "react";

type ToastType = "success" | "error";

interface Props {
  type: ToastType;
  message: string;
  onDismiss: () => void;
  durationMs?: number;
}

export function Toast({ type, message, onDismiss, durationMs = 2500 }: Props) {
  useEffect(() => {
    const id = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(id);
  }, [onDismiss, durationMs]);

  return (
    <div
      role="status"
      className={`fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
        type === "success"
          ? "bg-emerald-500 text-neutral-950 shadow-emerald-500/30"
          : "bg-rose-500 text-white shadow-rose-500/30"
      }`}
    >
      {message}
    </div>
  );
}
