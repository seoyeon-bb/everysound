"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useDeviceId } from "@/hooks/useDeviceId";
import { CategoryPicker } from "@/components/upload/CategoryPicker";
import { TagInput } from "@/components/upload/TagInput";
import { RecordingWidget } from "@/components/upload/RecordingWidget";
import { Field } from "@/components/upload/Field";
import type { CategoryKey } from "@/lib/categories";

const TEXT_INPUT =
  "w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-base text-neutral-100 placeholder:text-neutral-600 focus:border-emerald-500/50 focus:outline-none";

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
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDurationMs, setAudioDurationMs] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (storedNickname) setLocalNickname(storedNickname);
  }, [storedNickname]);

  const canSubmit =
    title.trim() !== "" &&
    summary.trim() !== "" &&
    category !== null &&
    audioBlob !== null &&
    deviceId !== "" &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit || !audioBlob || !category) return;
    setSubmitting(true);
    setError(null);
    try {
      const soundId = crypto.randomUUID();
      const ext = audioBlob.type.includes("webm")
        ? "webm"
        : audioBlob.type.includes("mp4")
          ? "mp4"
          : audioBlob.type.includes("ogg")
            ? "ogg"
            : "audio";
      const fileName = `${soundId}.${ext}`;

      const r1 = await fetch("/api/sounds/upload-url", {
        method: "POST",
        headers: {
          "X-Device-Id": deviceId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName,
          contentType: audioBlob.type,
          contentLength: audioBlob.size,
        }),
      });
      if (!r1.ok) {
        const e = await r1.json().catch(() => ({}));
        throw new Error(e.error ?? `presign HTTP ${r1.status}`);
      }
      const { url, key } = (await r1.json()) as { url: string; key: string };

      const r2 = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": audioBlob.type },
        body: audioBlob,
      });
      if (!r2.ok) {
        throw new Error(`upload HTTP ${r2.status}`);
      }

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
          duration_ms: audioDurationMs,
          uploader_nickname: nickname.trim() || null,
        }),
      });
      if (!r3.ok) {
        const e = await r3.json().catch(() => ({}));
        throw new Error(e.error ?? `insert HTTP ${r3.status}`);
      }

      if (nickname.trim()) saveNickname(nickname.trim());
      router.replace("/archive");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
    }
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
          {submitting ? t("submitting") : t("submit")}
        </button>
      </header>

      <h1 className="text-2xl font-bold tracking-tight">{t("heading")}</h1>

      {error && (
        <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}

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

        <Field label={`${t("fields.recording")} *`}>
          <RecordingWidget
            onChange={(blob, ms) => {
              setAudioBlob(blob);
              setAudioDurationMs(ms);
            }}
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
    </div>
  );
}
