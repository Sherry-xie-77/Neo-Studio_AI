import { type BilingualText, type FeedVideoItem } from "@/lib/types";

const templateCollectionTitles: Record<string, BilingualText> = {
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

function isTemplateCollection(collection: string) {
  return collection in templateCollectionTitles;
}

export function resolveSeriesForVideo(target: FeedVideoItem, videos: FeedVideoItem[]) {
  const sortedVideos = [...videos].sort(sortEpisodes);

  if (isTemplateCollection(target.collection)) {
    return {
      episodes: sortedVideos,
      title: {
        en: "AI Video Pro Anthology",
        zh: "AI Video Pro 连播",
      },
      collectionLabel: "AI Video Pro Anthology",
    };
  }

  const sameCollection = sortedVideos.filter((video) => video.collection === target.collection);

  return {
    episodes: sameCollection.length ? sameCollection : [target],
    title: {
      en: target.collection,
      zh: target.collection,
    },
    collectionLabel: target.collection,
  };
}

export function getFirstEpisodeForVideo(target: FeedVideoItem, videos: FeedVideoItem[]) {
  return resolveSeriesForVideo(target, videos).episodes[0] ?? target;
}
