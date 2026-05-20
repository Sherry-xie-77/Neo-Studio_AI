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

function isEmpireOfDustText(value: string) {
  return /empire\s+of\s+dust|尘埃帝国/i.test(value);
}

export function isEmpireOfDustVideo(video: FeedVideoItem) {
  return (
    video.discoverCategoryId === "empire-of-dust" ||
    isEmpireOfDustText(video.collection) ||
    isEmpireOfDustText(video.title.en) ||
    isEmpireOfDustText(video.title.zh)
  );
}

export function getEpisodeNumber(video: FeedVideoItem) {
  const source = [video.title.en, video.title.zh, video.summary.en, video.summary.zh].join(" ");
  const english = source.match(/\bEP(?:ISODE)?\s*0*(\d+)\b/i);
  if (english) return Number(english[1]);
  const chinese = source.match(/第\s*0*(\d+)\s*集/);
  return chinese ? Number(chinese[1]) : undefined;
}

function sortEpisodes(a: FeedVideoItem, b: FeedVideoItem) {
  const episodeA = getEpisodeNumber(a);
  const episodeB = getEpisodeNumber(b);
  if (episodeA !== undefined && episodeB !== undefined && episodeA !== episodeB) {
    return episodeA - episodeB;
  }
  if (episodeA !== undefined && episodeB === undefined) return -1;
  if (episodeA === undefined && episodeB !== undefined) return 1;
  return a.id.localeCompare(b.id, undefined, { numeric: true });
}

function isTemplateCollection(collection: string) {
  return collection in templateCollectionTitles;
}

function seriesKey(video: FeedVideoItem) {
  if (isEmpireOfDustVideo(video)) return "empire-of-dust";
  return video.collection;
}

function isRealPlayableUrl(value: string | undefined) {
  const url = value?.trim();
  return Boolean(url && !url.includes("/media/share/placeholder.svg"));
}

export function hasPlayableAsset(video: FeedVideoItem) {
  return isRealPlayableUrl(video.videoUrl) && isRealPlayableUrl(video.posterUrl);
}

export function isStandaloneVideo(video: FeedVideoItem) {
  return video.discoverCategoryId === "ad";
}

export function resolveSeriesForVideo(target: FeedVideoItem, videos: FeedVideoItem[]) {
  const sortedVideos = [...videos].filter(hasPlayableAsset).sort(sortEpisodes);

  if (isStandaloneVideo(target)) {
    return {
      episodes: [target],
      title: target.title,
      collectionLabel: target.collection,
    };
  }

  if (isEmpireOfDustVideo(target)) {
    return {
      episodes: sortedVideos.filter((video) => !isStandaloneVideo(video) && seriesKey(video) === "empire-of-dust"),
      title: {
        en: "Empire of Dust",
        zh: "尘埃帝国",
      },
      collectionLabel: "Empire of Dust",
    };
  }

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

  const sameCollection = sortedVideos.filter(
    (video) => !isStandaloneVideo(video) && seriesKey(video) === seriesKey(target),
  );

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
