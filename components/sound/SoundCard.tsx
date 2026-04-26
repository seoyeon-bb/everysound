"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Chip } from "@/components/ui/Chip";
import type { Sound } from "@/types/sound";

interface SoundCardProps {
  sound: Sound;
  onPlay?: (sound: Sound) => void;
  onAddToLaunchpad?: (sound: Sound) => void;
}

export function SoundCard({ sound, onPlay, onAddToLaunchpad }: SoundCardProps) {
  const tActions = useTranslations("archive.actions");
  const tCat = useTranslations("category");

  return (
    <article className="border-b border-neutral-900 px-5 py-4">
      <div className="flex gap-3">
        <Link href={`/archive/${sound.id}`} className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <Chip variant="category">{tCat(sound.category)}</Chip>
            {sound.pitch && <Chip variant="pitch">{sound.pitch}</Chip>}
          </div>
          <h3 className="truncate text-base font-semibold text-neutral-100">
            {sound.title}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-sm text-neutral-400">
            {sound.summary}
          </p>
          {sound.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {sound.tags.map((tag) => (
                <Chip key={tag} variant="tag">
                  #{tag}
                </Chip>
              ))}
            </div>
          )}
        </Link>
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={() => onPlay?.(sound)}
            className="rounded-full bg-emerald-500 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 transition active:scale-95"
          >
            {tActions("play")}
          </button>
          <button
            type="button"
            onClick={() => onAddToLaunchpad?.(sound)}
            className="rounded-full bg-neutral-800 px-3.5 py-1.5 text-xs font-semibold text-neutral-200 transition hover:bg-neutral-700 active:scale-95"
          >
            {tActions("addToLaunchpad")}
          </button>
        </div>
      </div>
    </article>
  );
}
