"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { play } from "@/lib/audio/engine";
import { useDeviceId } from "@/hooks/useDeviceId";
import { addToLaunchpad } from "@/hooks/useLaunchpad";
import { Toast } from "@/components/ui/Toast";

interface Props {
  soundId: string;
  audioKey: string | null;
  initialRecommendCount: number;
}

export function SoundActions({
  soundId,
  audioKey,
  initialRecommendCount,
}: Props) {
  const tDetail = useTranslations("detail");
  const tToast = useTranslations("archive.toast");
  const { deviceId } = useDeviceId();
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [recommended, setRecommended] = useState(false);
  const [recCount, setRecCount] = useState(initialRecommendCount);
  const [recLoading, setRecLoading] = useState(false);

  const playable = Boolean(audioKey);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;
    fetch(`/api/sounds/${soundId}/recommend`, {
      headers: { "X-Device-Id": deviceId },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setRecommended(Boolean(d.recommended));
        setRecCount(typeof d.count === "number" ? d.count : 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [soundId, deviceId]);

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
      setToast({
        type: "error",
        message: tToast("addFailed", { message: result.error }),
      });
    }
  }

  async function toggleRecommend() {
    if (!deviceId || recLoading) return;
    setRecLoading(true);

    const prevRecommended = recommended;
    const prevCount = recCount;
    setRecommended(!prevRecommended);
    setRecCount(prevCount + (prevRecommended ? -1 : 1));

    try {
      const r = await fetch(`/api/sounds/${soundId}/recommend`, {
        method: prevRecommended ? "DELETE" : "POST",
        headers: { "X-Device-Id": deviceId },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      setRecommended(Boolean(d.recommended));
      setRecCount(typeof d.count === "number" ? d.count : prevCount);
    } catch {
      setRecommended(prevRecommended);
      setRecCount(prevCount);
    } finally {
      setRecLoading(false);
    }
  }

  return (
    <>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={() => {
            play(audioKey);
            if (playable) {
              void fetch(`/api/sounds/${soundId}/play`, {
                method: "POST",
              }).catch(() => {});
            }
          }}
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

      <button
        type="button"
        onClick={toggleRecommend}
        disabled={recLoading}
        className={`mt-2 flex w-full items-center justify-center gap-2 rounded-full border py-3 text-sm font-medium transition ${
          recommended
            ? "border-rose-500/50 bg-rose-500/10 text-rose-300"
            : "border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-neutral-100"
        }`}
      >
        <svg
          viewBox="0 0 24 24"
          fill={recommended ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          className="h-4 w-4"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
        </svg>
        {tDetail("recommend")} {recCount > 0 && <span>{recCount}</span>}
      </button>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
