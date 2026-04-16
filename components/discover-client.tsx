"use client";

import Image from "next/image";
import { Eye, Flame } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { type FeedVideoItem, type Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

type DiscoverClientProps = {
  locale: Locale;
  videos: FeedVideoItem[];
};

const categories = [
  { id: "all", zh: "全部", en: "All" },
  { id: "featured", zh: "精选", en: "Featured" },
  { id: "short-video", zh: "短视频", en: "Short Video" },
  { id: "comic", zh: "漫剧", en: "Comic Drama" },
  { id: "short-drama", zh: "短剧", en: "Short Drama" },
  { id: "ad", zh: "广告片", en: "Ad Film" },
  { id: "mv", zh: "MV", en: "MV" },
] as const;

const sortOptions = [
  { id: "popular", zh: "最受欢迎", en: "Most Popular" },
  { id: "latest", zh: "最新", en: "Latest" },
] as const;

function matchesCategory(video: FeedVideoItem, categoryId: (typeof categories)[number]["id"], index: number) {
  if (categoryId === "all") return true;
  if (categoryId === "featured") return index < 10;
  if (categoryId === "short-video") return index % 2 === 0;
  if (categoryId === "comic") return video.title.en.toLowerCase().includes("origami");
  if (categoryId === "short-drama") return video.title.en.toLowerCase().includes("storybook");
  if (categoryId === "ad") return video.title.en.toLowerCase().includes("macro");
  if (categoryId === "mv") return video.title.en.toLowerCase().includes("loop");
  return true;
}

export function DiscoverClient({ locale, videos }: DiscoverClientProps) {
  const [selectedCategory, setSelectedCategory] = useState<(typeof categories)[number]["id"]>("all");
  const [selectedSort, setSelectedSort] = useState<(typeof sortOptions)[number]["id"]>("popular");

  const filteredVideos = useMemo(() => {
    let result = [...videos];

    if (selectedCategory !== "all") {
      result = result.filter((video, index) => matchesCategory(video, selectedCategory, index));
    }

    if (selectedSort === "popular") {
      result.sort((a, b) => b.likesCount + b.commentsCount - (a.likesCount + a.commentsCount));
    } else {
      result.sort((a, b) => b.id.localeCompare(a.id));
    }

    return result;
  }, [selectedCategory, selectedSort, videos]);

  const hotPicks = filteredVideos.slice(0, 5);
  const groupedSections = useMemo(
    () =>
      categories
        .filter((category) => category.id !== "all")
        .map((category) => ({
          id: category.id,
          titleZh: category.zh,
          titleEn: category.en,
          videos: videos.filter((video, index) => matchesCategory(video, category.id, index)).slice(0, 5),
        }))
        .filter((section) => section.videos.length > 0),
    [videos],
  );

  return (
    <div className="space-y-10">
      <section className="space-y-5 rounded-[28px] border border-[rgba(165,215,255,0.14)] bg-[rgba(7,17,40,0.48)] p-6 shadow-[0_22px_50px_rgba(0,0,0,0.2)] backdrop-blur-xl">
        <div className="overflow-hidden rounded-full border border-[rgba(165,215,255,0.14)] bg-[rgba(255,255,255,0.04)] px-5 py-3">
          <input
            placeholder={locale === "zh" ? "搜索系列..." : "Search series..."}
            className="w-full border-0 bg-transparent text-base text-[var(--avp-text)] outline-none placeholder:text-[var(--avp-text-muted)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {categories.map((category) => {
            const active = selectedCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "rounded-full px-5 py-3 text-sm font-semibold transition",
                  active
                    ? "bg-white text-[#081838]"
                    : "bg-[rgba(255,255,255,0.06)] text-[var(--avp-text-muted)] hover:bg-[rgba(255,255,255,0.1)] hover:text-[var(--avp-text)]",
                )}
              >
                {locale === "zh" ? category.zh : category.en}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xl font-semibold text-[var(--avp-text)]">
            <Flame className="h-5 w-5 text-[#ffb21e]" />
            <span>Hot Picks</span>
          </div>

          <div className="flex items-center gap-2">
            {sortOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelectedSort(option.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition",
                  selectedSort === option.id
                    ? "border-[rgba(178,226,255,0.32)] bg-[rgba(79,153,255,0.18)] text-[var(--avp-text)]"
                    : "border-[rgba(165,215,255,0.14)] bg-[rgba(255,255,255,0.04)] text-[var(--avp-text-muted)] hover:text-[var(--avp-text)]",
                )}
              >
                {locale === "zh" ? option.zh : option.en}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          {hotPicks.map((video, index) => (
            <article
              key={video.id}
              className="rounded-[22px] border border-[rgba(165,215,255,0.12)] bg-[rgba(5,14,34,0.88)] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.18)]"
            >
              <div className="relative aspect-[9/16] overflow-hidden rounded-[18px]">
                <Image
                  src={video.posterUrl}
                  alt={video.title[locale]}
                  fill
                  sizes="(min-width: 1024px) 18vw, 100vw"
                  className="object-cover"
                />
                <div className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-[#ff9f0a] text-sm font-semibold text-white">
                  {index + 1}
                </div>
                <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-[11px] text-white">
                  <Eye className="h-3 w-3" />
                  <span>{video.commentsCount + 2}</span>
                </div>
              </div>
              <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-[var(--avp-text)]">
                {video.title[locale]}
              </h3>
              <div className="mt-3 flex justify-end">
                <Link
                  href={`/watch/${video.id}?lang=${locale}`}
                  className="inline-flex min-h-[38px] items-center justify-center rounded-full border border-[rgba(178,226,255,0.3)] bg-[rgba(79,153,255,0.18)] px-4 text-sm font-semibold text-[var(--avp-text)] transition hover:border-[rgba(178,226,255,0.42)] hover:bg-[rgba(79,153,255,0.26)]"
                >
                  {locale === "zh" ? "观看" : "Watch"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {groupedSections.map((section) => (
        <section key={section.id} className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold text-[var(--avp-text)]">
                {locale === "zh" ? section.titleZh : section.titleEn}
              </h2>
            </div>
            <button
              type="button"
              className="rounded-full border border-[rgba(165,215,255,0.14)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm text-[var(--avp-text-muted)] transition hover:text-[var(--avp-text)]"
            >
              See all
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-5">
            {section.videos.map((video, index) => (
              <article
                key={video.id}
                className="rounded-[22px] border border-[rgba(165,215,255,0.12)] bg-[rgba(7,17,40,0.54)] p-3 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur-xl"
              >
                <div className="relative aspect-[9/16] overflow-hidden rounded-[18px]">
                  <Image
                    src={video.posterUrl}
                    alt={video.title[locale]}
                    fill
                    sizes="(min-width: 1024px) 18vw, 100vw"
                    className="object-cover"
                  />
                  <div className="absolute right-3 top-3 rounded-full bg-[rgba(3,18,46,0.72)] px-2 py-1 text-[11px] text-white">
                    {selectedSort === "popular"
                      ? locale === "zh"
                        ? "最受欢迎"
                        : "Popular"
                      : locale === "zh"
                        ? "最新"
                        : "Latest"}
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  <h3 className="line-clamp-2 text-lg font-semibold text-[var(--avp-text)]">
                    {video.title[locale]}
                  </h3>
                  <p className="text-sm text-[var(--avp-text-muted)]">
                    {locale === "zh" ? `作者 ${index + 1}` : `Author ${index + 1}`}
                  </p>
                  <p className="text-sm text-[var(--avp-text-muted)]">
                    {(video.likesCount + video.commentsCount + 38).toLocaleString()}{" "}
                    {locale === "zh" ? "观看" : "views"}
                  </p>
                </div>
                <div className="mt-3 flex justify-end">
                  <Link
                    href={`/watch/${video.id}?lang=${locale}`}
                    className="inline-flex min-h-[38px] items-center justify-center rounded-full border border-[rgba(178,226,255,0.24)] bg-[rgba(255,255,255,0.04)] px-4 text-sm font-semibold text-[var(--avp-text)] transition hover:border-[rgba(178,226,255,0.42)] hover:bg-[rgba(79,153,255,0.16)]"
                  >
                    {locale === "zh" ? "观看" : "Watch"}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
