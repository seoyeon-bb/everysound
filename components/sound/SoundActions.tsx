"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { play } from "@/lib/audio/engine";
import { useDeviceId } from "@/hooks/useDeviceId";
import { addToLaunchpad } from "@/hooks/useLaunchpad";
import { Toast } from "@/components/ui/Toast";

interface Props {
  soundId: string;
  audioKey: string | null;
}

export function SoundActions({ soundId, audioKey }: Props) {
  const tDetail = useTranslations("detail");
  const tToast = useTranslations("archive.toast");
  const { deviceId } = useDeviceId();
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const playable = Boolean(audioKey);

  async function handleAdd() {
    if (!deviceId) return;
    const result = await addToLaunchpad(deviceId, soundId);
    if (result.ok) {
      setToast({ type: "success", message: tToast("addedToLaunchpad") });
    } else if (result.error === "already_added") {
      setToast({ type: "error", message: tToast("alreadyAdded") });
    } else if (result.error === "launchpad_full") {
      setToast({ type: "error", message: tToast("launchpadFull") });
    } else {
      setToast({ type: "error", message: tToast("addFailed", { message: result.error }) });
    }
  }

  return (
    <>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => play(audioKey)}
          disabled={!playable}
          className={`flex-1 rounded-full py-3 text-sm font-semibold transition active:scale-[0.98] ${
            playable
              ? "bg-emerald-500 text-neutral-950"
              : "cursor-not-allowed bg-neutral-800 text-neutral-600"
          }`}
        >
          {tDetail("play")}
        </button>
        <button
          type="button"
          onClick={handleAdd}
          className="flex-1 rounded-full bg-neutral-800 py-3 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700 active:scale-[0.98]"
        >
          {tDetail("addToLaunchpad")}
        </button>
      </div>

      {toast && (
        <Toast type={toast.type} message={toast.message} onDismiss={() => setToast(null)} />
      )}
    </>
  );
}
