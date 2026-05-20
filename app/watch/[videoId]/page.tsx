import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Heart, Play, Share2, Star } from "lucide-react";
import { notFound } from "next/navigation";

import { LoginWatchGate } from "@/components/login-watch-gate";
import { PremiumWatchGate } from "@/components/premium-watch-gate";
import { SiteShell } from "@/components/site-shell";
import { getAllFeedVideos, getFeedVideoById } from "@/lib/server/store";
import { resolveSeriesForVideo, getEpisodeNumber, isStandaloneVideo } from "@/lib/watch-series";

function getLocale(searchParams: { lang?: string }) {
  return searchParams.lang === "zh" ? "zh" : "en";
}

export default async function WatchVideoPage({
  params,
  searchParams,
}: {
  params: Promise<{ videoId: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const [{ videoId }, rawSearchParams] = await Promise.all([params, searchParams]);
  const locale = getLocale(rawSearchParams);
  const [video, videos] = await Promise.all([getFeedVideoById(videoId), getAllFeedVideos()]);

  if (!video) {
    notFound();
  }

  const series = resolveSeriesForVideo(video, videos);
  const currentEpisodeIndex = series.episodes.findIndex((item) => item.id === video.id);
  const episodeNumber = getEpisodeNumber(video) ?? (currentEpisodeIndex >= 0 ? currentEpisodeIndex + 1 : 1);
  const standalone = isStandaloneVideo(video);
  const episodeLabel = standalone
    ? locale === "zh"
      ? "独立短片"
      : "Standalone"
    : locale === "zh"
      ? `第 ${episodeNumber} 集`
      : `Episode ${episodeNumber}`;

  return (
    <SiteShell locale={locale} className="pb-20">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <Link
              href={`/?lang=${locale}`}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--avp-border)] bg-[rgba(255,255,255,0.04)] px-4 py-2 text-sm text-[var(--avp-text-muted)] transition hover:text-[var(--avp-text)]"
            >
              <ChevronLeft className="h-4 w-4" />
              {locale === "zh" ? "返回首页" : "Back to home"}
            </Link>

            <div className="text-right text-sm text-[var(--avp-text-muted)]">
              {series.title[locale]} / {episodeLabel}
            </div>
          </div>

          <div className="overflow-hidden rounded-[34px] border border-[var(--avp-border)] bg-[rgba(2,8,20,0.88)] shadow-[0_30px_80px_rgba(0,0,0,0.34)]">
            <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="bg-black">
                <div className="relative flex min-h-[720px] items-center justify-center p-4 sm:p-6">
                  <LoginWatchGate
                    locale={locale}
                    nextPath={`/watch/${video.id}?lang=${locale}`}
                    posterUrl={video.posterUrl}
                  />
                  <PremiumWatchGate
                    locale={locale}
                    paywallIndex={currentEpisodeIndex >= 0 ? currentEpisodeIndex : 0}
                    episodeNumber={episodeNumber}
                    videoUrl={video.videoUrl}
                    posterUrl={video.posterUrl}
                  />
                </div>

                <div className="border-t border-[rgba(178,226,255,0.14)] bg-[rgba(2,8,20,0.96)] p-5 sm:p-6">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--avp-text-muted)]">
                    {episodeLabel}
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold text-[var(--avp-text)]">
                    {video.title[locale]}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--avp-text-muted)]">
                    {video.summary[locale]}
                  </p>
                </div>
              </div>

              <aside className="space-y-5 border-t border-[var(--avp-border)] bg-[rgba(2,8,20,0.96)] p-6 xl:border-l xl:border-t-0">
                <div>
                  <p className="text-sm text-[var(--avp-text-muted)]">
                    {locale === "zh"
                      ? `Home / ${series.title[locale]} / ${episodeLabel}`
                      : `Home / ${series.title[locale]} / ${episodeLabel}`}
                  </p>
                  <h2 className="mt-4 text-3xl font-semibold leading-tight text-[var(--avp-text)]">
                    {standalone ? video.title[locale] : `${episodeLabel} · ${video.title[locale]}`}
                  </h2>
                </div>

                <div>
                  <p className="text-sm font-semibold text-[var(--avp-text)]">
                    {locale === "zh" ? "本集简介" : "Episode summary"}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[var(--avp-text-muted)]">
                    {video.recommendationReason[locale]}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[video.trendLabel[locale], video.collection, video.featured ? (locale === "zh" ? "精选推荐" : "Featured") : null]
                    .filter(Boolean)
                    .map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[var(--avp-border)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-xs text-[var(--avp-text-muted)]"
                      >
                        {tag}
                      </span>
                    ))}
                </div>

                <div className="grid grid-cols-3 gap-3 border-y border-[rgba(255,255,255,0.08)] py-5 text-center">
                  <div>
                    <Heart className="mx-auto h-5 w-5 text-[var(--avp-text)]" />
                    <p className="mt-2 text-sm text-[var(--avp-text)]">
                      {(video.likesCount + 12).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Star className="mx-auto h-5 w-5 text-[var(--avp-text)]" />
                    <p className="mt-2 text-sm text-[var(--avp-text)]">
                      {(video.likesCount + video.commentsCount + 620).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Share2 className="mx-auto h-5 w-5 text-[var(--avp-text)]" />
                    <p className="mt-2 text-sm text-[var(--avp-text)]">
                      {locale === "zh" ? "分享" : "Share"}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-4 text-sm">
                      <button className="border-b-2 border-[#ff4f70] pb-2 text-[#ff748f]">
                        1 - {series.episodes.length}
                      </button>
                    </div>
                    <p className="text-sm text-[var(--avp-text-muted)]">
                      {standalone ? (locale === "zh" ? "独立视频" : "Standalone video") : (locale === "zh" ? "全部剧集" : "All episodes")}
                    </p>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {series.episodes.map((episode, index) => {
                      const active = episode.id === video.id;

                      return (
                        <Link
                          key={episode.id}
                          href={`/watch/${episode.id}?lang=${locale}`}
                          className={active
                            ? "flex min-h-[42px] items-center justify-center rounded-[10px] border border-[rgba(255,99,132,0.5)] bg-[rgba(255,79,112,0.18)] text-sm font-semibold text-white"
                            : "flex min-h-[42px] items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-sm text-[var(--avp-text-muted)] transition hover:text-[var(--avp-text)]"
                          }
                        >
                          {getEpisodeNumber(episode) ?? index + 1}
                        </Link>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[22px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-4">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--avp-text-muted)]">
                    {locale === "zh" ? "继续创作" : "Keep creating"}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[var(--avp-text-muted)]">
                    {locale === "zh"
                      ? "喜欢这个短剧风格？用同款模板继续生成你的专属镜头。"
                      : "Like this short-drama style? Use the same template to create your own shot."}
                  </p>
                  <Link
                    href={`/create?template=${video.templateSlug}&from=${video.id}&lang=${locale}`}
                    className="group mt-4 flex min-h-[56px] w-full items-center justify-center overflow-hidden rounded-[18px] border border-[rgba(178,226,255,0.28)] bg-[linear-gradient(135deg,rgba(79,153,255,0.24)_0%,rgba(139,125,255,0.22)_52%,rgba(255,116,143,0.18)_100%)] px-4 text-sm font-bold text-[var(--avp-text)] shadow-[0_18px_48px_rgba(79,153,255,0.18)] transition hover:-translate-y-0.5 hover:border-[rgba(178,226,255,0.48)] hover:shadow-[0_22px_64px_rgba(139,125,255,0.28)]"
                  >
                    <span className="absolute inset-0 translate-x-[-120%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)] transition duration-700 group-hover:translate-x-[120%]" />
                    <span className="relative flex items-center gap-2">
                      <Play className="h-4 w-4 shrink-0 text-[#b2e2ff]" />
                      <span className="tracking-[0.08em]">Generate</span>
                    </span>
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <aside className="space-y-4 rounded-[30px] border border-[var(--avp-border)] bg-[rgba(7,17,40,0.58)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl xl:sticky xl:top-24 xl:h-fit">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--avp-text-muted)]">
              {locale === "zh" ? "你可能还会看" : "More to watch"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--avp-text)]">
              {series.title[locale]}
            </h3>
          </div>

          <div className="grid gap-3">
            {series.episodes.map((episode, index) => {
              const active = episode.id === video.id;

              return (
                <Link
                  key={episode.id}
                  href={`/watch/${episode.id}?lang=${locale}`}
                  className={active
                    ? "grid grid-cols-[70px_minmax(0,1fr)] gap-3 rounded-[22px] border border-[rgba(255,99,132,0.4)] bg-[rgba(255,79,112,0.12)] p-3"
                    : "grid grid-cols-[70px_minmax(0,1fr)] gap-3 rounded-[22px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-3 transition hover:border-[var(--avp-border-strong)]"
                  }
                >
                  <div className="relative overflow-hidden rounded-[14px]">
                    <Image
                      src={episode.posterUrl}
                      alt={episode.title[locale]}
                      width={70}
                      height={124}
                      className="aspect-[9/16] h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--avp-text-muted)]">
                      {locale === "zh" ? `第 ${getEpisodeNumber(episode) ?? index + 1} 集` : `Episode ${getEpisodeNumber(episode) ?? index + 1}`}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold text-[var(--avp-text)]">
                      {episode.title[locale]}
                    </p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--avp-text-muted)]">
                      {episode.summary[locale]}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>
      </div>
    </SiteShell>
  );
}
