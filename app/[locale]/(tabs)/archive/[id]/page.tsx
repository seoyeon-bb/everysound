import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Chip } from "@/components/ui/Chip";
import { SoundActions } from "@/components/sound/SoundActions";
import { supabaseServerAnon } from "@/lib/supabase/server";
import type { Sound } from "@/types/sound";

export default async function SoundDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;

  const supabase = supabaseServerAnon();
  if (!supabase) {
    return (
      <div className="px-5 pt-10 text-center text-sm text-rose-300">
        Supabase 환경변수 미설정
      </div>
    );
  }

  const { data, error } = await supabase
    .from("sounds")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();
  const sound = data as Sound;

  const tCat = await getTranslations("category");
  const tDetail = await getTranslations("detail");

  return (
    <article className="px-5 pb-10 pt-6">
      <div className="mb-4">
        <Link
          href="/archive"
          className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {tDetail("back")}
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Chip variant="category" size="md">
          {tCat(sound.category)}
        </Chip>
      </div>

      <h1 className="mt-3 text-2xl font-bold tracking-tight">{sound.title}</h1>
      <p className="mt-1 text-base text-neutral-300">{sound.summary}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
        <span>by {sound.uploader_nickname ?? tDetail("anonymous")}</span>
        <span>·</span>
        <span>{tDetail("plays", { count: sound.play_count })}</span>
        <span>·</span>
        <span>{tDetail("addedToLaunchpad", { count: sound.launchpad_add_count })}</span>
      </div>

      <SoundActions
        soundId={sound.id}
        audioKey={sound.audio_key}
        initialRecommendCount={sound.recommend_count}
      />

      {sound.description && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-neutral-400">
            {tDetail("description")}
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-200">
            {sound.description}
          </p>
        </section>
      )}

      {sound.tags.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-neutral-400">
            {tDetail("tags")}
          </h2>
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
