import { type BilingualText, type FeedVideoItem } from "@/lib/types";

const collectionTitles: Record<string, BilingualText> = {
  "Trending Now": {
    en: "Trending Hit List",
    zh: "爆款热播榜",
  },
  "Ambient Worlds": {
    en: "Ambient Story Theater",
    zh: "氛围剧场",
  },
  "Ready to Remix": {
    en: "Remix Story Theater",
    zh: "复刻剧场",
  },
  "Commercial Looks": {
    en: "Commercial Style Theater",
    zh: "广告感剧场",
  },
};

function sortEpisodes(a: FeedVideoItem, b: FeedVideoItem) {
  return a.id.localeCompare(b.id);
}

export function resolveSeriesForVideo(target: FeedVideoItem, videos: FeedVideoItem[]) {
  const sameCollection = videos
    .filter((video) => video.collection === target.collection)
    .sort(sortEpisodes);

  if (sameCollection.length >= 2) {
    return {
      episodes: sameCollection,
      title: collectionTitles[target.collection] ?? {
        en: target.collection,
        zh: target.collection,
      },
      collectionLabel: target.collection,
    };
  }

  return {
    episodes: [...videos].sort(sortEpisodes).slice(0, Math.min(videos.length, 12)),
    title: {
      en: "AI Video Pro Anthology",
      zh: "AI Video Pro 连播",
    },
    collectionLabel: target.collection,
  };
}
