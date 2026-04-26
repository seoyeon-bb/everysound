import type { ReactNode } from "react";

interface Props {
  label: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, hint, children }: Props) {
  return (
    <div>
      <label className="text-sm font-medium text-neutral-200">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
