"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useDeviceId } from "@/hooks/useDeviceId";
import { CategoryPicker } from "@/components/upload/CategoryPicker";
import { TagInput } from "@/components/upload/TagInput";
import { RecordingWidget } from "@/components/upload/RecordingWidget";
import { TrimWidget, type TrimWidgetHandle } from "@/components/upload/TrimWidget";
import { Field } from "@/components/upload/Field";
import { encodePcmMonoToMp3, normalizeRms } from "@/lib/audio/encoder";
import type { CategoryKey } from "@/lib/categories";

const TEXT_INPUT =
  "w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-base text-neutral-100 placeholder:text-neutral-600 focus:border-emerald-500/50 focus:outline-none";

type Phase = "idle" | "encoding" | "uploading" | "saving";

export default function UploadPage() {
  const router = useRouter();
  const t = useTranslations("upload");
  const { deviceId, nickname: storedNickname, setNickname: saveNickname } = useDeviceId();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<CategoryKey | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [nickname, setLocalNickname] = useState("");
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const trimRef = useRef<TrimWidgetHandle>(null);

  useEffect(() => {
    if (storedNickname) setLocalNickname(storedNickname);
  }, [storedNickname]);

  const captured = audioBuffer !== null;
  const submitting = phase !== "idle";
  const canSubmit =
    captured &&
    title.trim() !== "" &&
    summary.trim() !== "" &&
    category !== null &&
    deviceId !== "" &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit || !audioBuffer || !category) return;
    setError(null);

    setPhase("encoding");
    let mp3Blob: Blob;
    let durationMs: number;
    try {
      const trim = trimRef.current?.getCurrentTrim();
      if (!trim || trim.samples.length === 0) {
        throw new Error("no audio selected");
      }
      const normalized = normalizeRms(trim.samples);
      mp3Blob = encodePcmMonoToMp3(normalized, trim.sampleRate);
      durationMs = trim.durationMs;
    } catch (e) {
      setError(
        t("errors.encode", {
          message: e instanceof Error ? e.message : String(e),
        }),
      );
      setPhase("idle");
      return;
    }

    try {
      const soundId = crypto.randomUUID();
      const fileName = `${soundId}.mp3`;

      setPhase("uploading");
      const r1 = await fetch("/api/sounds/upload-url", {
        method: "POST",
        headers: {
          "X-Device-Id": deviceId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName,
          contentType: "audio/mpeg",
          contentLength: mp3Blob.size,
        }),
      });
      if (!r1.ok) {
        const e = await r1.json().catch(() => ({}));
        throw new Error(e.error ?? `presign HTTP ${r1.status}`);
      }
      const { url, key } = (await r1.json()) as { url: string; key: string };

      const r2 = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "audio/mpeg" },
        body: mp3Blob,
      });
      if (!r2.ok) {
        throw new Error(`upload HTTP ${r2.status}`);
      }

      setPhase("saving");
      const r3 = await fetch("/api/sounds", {
        method: "POST",
        headers: {
          "X-Device-Id": deviceId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: soundId,
          title: title.trim(),
          summary: summary.trim(),
          description: description.trim() || null,
          category,
          tags,
          audio_key: key,
          duration_ms: durationMs,
          uploader_nickname: nickname.trim() || null,
        }),
      });
      if (!r3.ok) {
        const e = await r3.json().catch(() => ({}));
        throw new Error(e.error ?? `insert HTTP ${r3.status}`);
      }

      saveNickname(nickname.trim());
      router.replace("/archive");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
    }
  }

  function submitLabel() {
    if (phase === "encoding") return t("phases.encoding");
    if (phase === "uploading") return t("phases.uploading");
    if (phase === "saving") return t("phases.saving");
    return t("submit");
  }

  return (
    <div className="px-5 pb-10 pt-6">
      <header className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-neutral-400 hover:text-neutral-200"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            canSubmit
              ? "bg-emerald-500 text-neutral-950 active:scale-95"
              : "bg-neutral-800 text-neutral-600"
          }`}
        >
          {submitLabel()}
        </button>
      </header>

      <h1 className="text-2xl font-bold tracking-tight">{t("heading")}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {captured ? t("subtitleAfter") : t("subtitleBefore")}
      </p>

      {error && (
        <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="mt-6">
        {captured && audioBuffer ? (
          <TrimWidget
            ref={trimRef}
            buffer={audioBuffer}
            onReset={() => setAudioBuffer(null)}
          />
        ) : (
          <RecordingWidget onCapture={setAudioBuffer} />
        )}
      </div>

      {captured && (
        <div className="mt-6 space-y-5">
          <Field label={`${t("fields.title")} *`}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("placeholders.title")}
              maxLength={40}
              className={TEXT_INPUT}
            />
          </Field>

          <Field label={`${t("fields.category")} *`}>
            <CategoryPicker value={category} onChange={setCategory} />
          </Field>

          <Field label={`${t("fields.summary")} *`}>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={t("placeholders.summary")}
              maxLength={60}
              className={TEXT_INPUT}
            />
          </Field>

          <Field label={t("fields.tags")} hint={t("hints.tags")}>
            <TagInput
              value={tags}
              onChange={setTags}
              max={3}
              placeholder={t("placeholders.tags")}
            />
          </Field>

          <Field label={t("fields.nickname")} hint={t("hints.nickname")}>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setLocalNickname(e.target.value)}
              placeholder={t("placeholders.nickname")}
              maxLength={20}
              className={TEXT_INPUT}
            />
          </Field>

          <Field label={t("fields.description")}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("placeholders.description")}
              rows={4}
              maxLength={500}
              className={`${TEXT_INPUT} resize-none`}
            />
          </Field>
        </div>
      )}
    </div>
  );
}
