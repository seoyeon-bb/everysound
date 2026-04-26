import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Chip } from "@/components/ui/Chip";
import { findMockSound } from "@/lib/mock/sounds";

export default async function SoundDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const sound = findMockSound(id);
  if (!sound) notFound();

  const tCat = await getTranslations("category");
  const tDetail = await getTranslations("detail");

  return (
    <article className="px-5 pb-10 pt-6">
      <div className="mb-4">
        <Link
          href="/archive"
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {tDetail("back")}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Chip variant="category" size="md">
          {tCat(sound.category)}
        </Chip>
        {sound.pitch && (
          <Chip variant="pitch" size="md">
            {sound.pitch}
          </Chip>
        )}
      </div>

      <h1 className="mt-3 text-2xl font-bold tracking-tight">{sound.title}</h1>
      <p className="mt-1 text-base text-neutral-300">{sound.summary}</p>

      <div className="mt-3 flex items-center gap-3 text-xs text-neutral-500">
        <span>by {sound.uploader_nickname ?? tDetail("anonymous")}</span>
        <span>·</span>
        <span>{tDetail("plays", { count: sound.play_count })}</span>
        <span>·</span>
        <span>{tDetail("recommends", { count: sound.recommend_count })}</span>
      </div>

      <div className="mt-6 flex gap-2">
        <button
          type="button"
          className="flex-1 rounded-full bg-emerald-500 py-3 text-sm font-semibold text-neutral-950 transition active:scale-[0.98]"
        >
          {tDetail("play")}
        </button>
        <button
          type="button"
          className="flex-1 rounded-full bg-neutral-800 py-3 text-sm font-semibold text-neutral-100 transition hover:bg-neutral-700 active:scale-[0.98]"
        >
          {tDetail("addToLaunchpad")}
        </button>
      </div>

      <button
        type="button"
        className="mt-2 w-full rounded-full border border-neutral-800 py-3 text-sm font-medium text-neutral-300 transition hover:border-neutral-700 hover:text-neutral-100"
      >
        ♥ {tDetail("recommend")}
      </button>

      {sound.description && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-neutral-400">{tDetail("description")}</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-200">
            {sound.description}
          </p>
        </section>
      )}

      {sound.tags.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-neutral-400">{tDetail("tags")}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sound.tags.map((tag) => (
              <Chip key={tag} variant="tag" size="md">
                #{tag}
              </Chip>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
