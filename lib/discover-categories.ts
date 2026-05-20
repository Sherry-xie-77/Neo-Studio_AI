import { isEmpireOfDustVideo } from "@/lib/watch-series";
import { type DiscoverCategory, type FeedVideoItem } from "@/lib/types";

export const defaultDiscoverCategories: DiscoverCategory[] = [
  { id: "all", title: { zh: "全部", en: "All" }, locked: true },
  { id: "featured", title: { zh: "精选", en: "Featured" } },
  { id: "short-video", title: { zh: "短视频", en: "Short Video" } },
  { id: "comic", title: { zh: "漫剧", en: "Comic Drama" } },
  { id: "short-drama", title: { zh: "短剧", en: "Short Drama" } },
  { id: "ad", title: { zh: "广告片", en: "Ad Film" } },
  { id: "mv", title: { zh: "MV", en: "MV" } },
];

export function normalizeDiscoverCategories(categories: DiscoverCategory[] | undefined) {
  const allCategory = defaultDiscoverCategories[0];
  const source = categories?.length ? categories : defaultDiscoverCategories;
  const seen = new Set<string>();
  const normalized = source
    .map((category) => ({
      id: category.id.trim() === "empire-of-dust" ? "short-drama" : category.id.trim(),
      title: category.id.trim() === "empire-of-dust"
        ? { zh: "短剧", en: "Short Drama" }
        : {
            zh: category.title.zh.trim(),
            en: category.title.en.trim() || category.title.zh.trim(),
          },
      match: category.id.trim() === "empire-of-dust" ? undefined : category.match?.trim(),
      locked: category.id === allCategory.id || category.locked,
    }))
    .filter((category) => category.id && category.title.zh && !seen.has(category.id) && seen.add(category.id));

  const withoutAll = normalized.filter((category) => category.id !== allCategory.id);
  return [{ ...allCategory, ...(normalized.find((category) => category.id === allCategory.id) ?? {}) }, ...withoutAll];
}

export function matchesDiscoverCategory(video: FeedVideoItem, category: DiscoverCategory, index: number) {
  if (category.id === "all") return true;
  if (category.id === "short-drama" && isEmpireOfDustVideo(video)) return true;
  if (video.discoverCategoryId) {
    if (video.discoverCategoryId === "empire-of-dust") return category.id === "short-drama";
    return video.discoverCategoryId === category.id;
  }
  if (category.id === "featured") return index < 10;
  if (category.id === "short-video") return index % 2 === 0;
  if (category.id === "comic") return video.title.en.toLowerCase().includes("origami");
  if (category.id === "short-drama") return video.title.en.toLowerCase().includes("storybook") || video.collection.toLowerCase().includes("drama");
  if (category.id === "ad") return video.title.en.toLowerCase().includes("macro");
  if (category.id === "mv") return video.title.en.toLowerCase().includes("loop");

  const searchable = [
    video.title.zh,
    video.title.en,
    video.summary.zh,
    video.summary.en,
    video.collection,
    video.trendLabel.zh,
    video.trendLabel.en,
    video.recommendationReason.zh,
    video.recommendationReason.en,
  ]
    .join(" ")
    .toLowerCase();
  const terms = (category.match || `${category.title.zh},${category.title.en},${category.id}`)
    .split(/[，,]/)
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);

  return terms.some((term) => searchable.includes(term));
}
