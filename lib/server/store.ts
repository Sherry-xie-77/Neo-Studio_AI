import { promises as fs } from "node:fs";
import path from "node:path";

import { defaultClientConfig, prismaPostgres } from "@prisma/ppg";
import { nanoid } from "nanoid";

import { makeInitialStore } from "@/lib/seed-data";
import { normalizeDiscoverCategories } from "@/lib/discover-categories";
import { getEpisodeNumber, getFirstEpisodeForVideo, hasPlayableAsset, isEmpireOfDustVideo, isStandaloneVideo } from "@/lib/watch-series";
import {
  type BilingualText,
  type ContentSettings,
  type CreateCommentRequest,
  type FeaturedCase,
  type FeedVideoItem,
  type GenerationRecord,
  type GenerationRequest,
  type GenerationStatus,
  type PremiumOrder,
  type PremiumOrderStatus,
  type StoreShape,
  type VideoComment,
  type VideoLike,
  type VideoTemplate,
} from "@/lib/types";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "generated", "mock-db.json");
const postgresUrl = process.env.PRISMA_DIRECT_TCP_URL ?? process.env.DATABASE_URL ?? process.env.PRISMA_DATABASE_URL ?? "";
const usePostgresStore = Boolean(postgresUrl);
const db = postgresUrl ? prismaPostgres(defaultClientConfig(postgresUrl)) : null;
let databaseReady = false;
const STORE_CACHE_TTL_MS = 20_000;
let storeCache: { value: StoreShape; expiresAt: number } | null = null;

function clearStoreCache() {
  storeCache = null;
}

function getDatabase() {
  if (!db) throw new Error("Database is not configured");
  return db;
}

async function ensureStoreFile() {
  await fs.mkdir(path.dirname(dataFile), { recursive: true });

  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(
      dataFile,
      JSON.stringify(makeInitialStore(), null, 2),
      "utf8",
    );
  }
}

function normalizeStoreShape(store: Partial<StoreShape>): StoreShape {
  const initial = makeInitialStore();

  if (
    !store.feedVideos ||
    !store.templates ||
    !store.comments ||
    !store.likes ||
    !store.generations ||
    !store.sessions
  ) {
    return initial;
  }

  const contentSettings = {
    ...initial.contentSettings,
    ...(store.contentSettings ?? initial.contentSettings),
    discoverCategories: normalizeDiscoverCategories(
      store.contentSettings?.discoverCategories ?? initial.contentSettings.discoverCategories,
    ),
  };

  const normalized: StoreShape = {
    feedVideos: store.feedVideos,
    templates: store.templates,
    comments: store.comments,
    likes: store.likes,
    generations: store.generations,
    sessions: store.sessions,
    premiumOrders: store.premiumOrders ?? {},
    featuredCases: store.featuredCases ?? {},
    contentSettings,
  };

  const hasRichFeedShape = Object.values(normalized.feedVideos).every(
    (video) =>
      video &&
      typeof video === "object" &&
      "summary" in video &&
      "recommendationReason" in video &&
      "useCases" in video &&
      "breakdownSteps" in video,
  );
  const hasRichTemplateShape = Object.values(normalized.templates).every(
    (template) =>
      template &&
      typeof template === "object" &&
      "summary" in template &&
      "promptFields" in template &&
      "quickTweaks" in template,
  );

  if (!hasRichFeedShape || !hasRichTemplateShape) {
    return {
      ...initial,
      comments: normalized.comments,
      likes: normalized.likes,
      generations: normalized.generations,
      sessions: normalized.sessions,
      premiumOrders: normalized.premiumOrders,
      featuredCases: normalized.featuredCases,
      contentSettings: normalized.contentSettings,
    };
  }

  return normalized;
}

async function readFileStore(): Promise<StoreShape> {
  await ensureStoreFile();
  const content = await fs.readFile(dataFile, "utf8");
  return normalizeStoreShape(JSON.parse(content) as Partial<StoreShape>);
}

async function writeFileStore(store: StoreShape) {
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2), "utf8");
}

async function ensureDatabase() {
  if (databaseReady) return;
  const database = getDatabase();

  await database.sql.exec`CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await database.sql.exec`CREATE TABLE IF NOT EXISTS feed_videos (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await database.sql.exec`CREATE TABLE IF NOT EXISTS templates (
    slug TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await database.sql.exec`CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await database.sql.exec`CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await database.sql.exec`CREATE TABLE IF NOT EXISTS generations (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await database.sql.exec`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await database.sql.exec`CREATE TABLE IF NOT EXISTS premium_orders (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    receipt TEXT NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;
  await database.sql.exec`CREATE TABLE IF NOT EXISTS featured_cases (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`;

  const existing = await database.sql<{ count: string }>`SELECT COUNT(*)::text AS count FROM feed_videos`.collect();
  databaseReady = true;
  if (Number(existing[0]?.count ?? 0) === 0) {
    await writeDatabaseStore(makeInitialStore());
  }
}

type JsonRow<T> = { value: T };

async function readDatabaseStore(): Promise<StoreShape> {
  await ensureDatabase();
  const database = getDatabase();
  const settingsResult = await database.sql<JsonRow<ContentSettings>>`SELECT value FROM kv_store WHERE key = 'content_settings'`.collect();
  const videosResult = await database.sql<JsonRow<FeedVideoItem>>`SELECT value FROM feed_videos`.collect();
  const templatesResult = await database.sql<JsonRow<VideoTemplate>>`SELECT value FROM templates`.collect();
  const commentsResult = await database.sql<JsonRow<VideoComment>>`SELECT value FROM comments`.collect();
  const likesResult = await database.sql<JsonRow<VideoLike>>`SELECT value FROM likes`.collect();
  const generationsResult = await database.sql<JsonRow<GenerationRecord>>`SELECT value FROM generations`.collect();
  const sessionsResult = await database.sql<JsonRow<{ id: string; createdAt: string; updatedAt: string }>>`SELECT value FROM sessions`.collect();
  const ordersResult = await database.sql<JsonRow<PremiumOrder>>`SELECT value FROM premium_orders`.collect();
  const casesResult = await database.sql<JsonRow<FeaturedCase>>`SELECT value FROM featured_cases`.collect();

  return normalizeStoreShape({
    feedVideos: Object.fromEntries(videosResult.map((row) => [row.value.id, row.value])),
    templates: Object.fromEntries(templatesResult.map((row) => [row.value.slug, row.value])),
    comments: Object.fromEntries(commentsResult.map((row) => [row.value.id, row.value])),
    likes: Object.fromEntries(likesResult.map((row) => [row.value.id, row.value])),
    generations: Object.fromEntries(generationsResult.map((row) => [row.value.id, row.value])),
    sessions: Object.fromEntries(sessionsResult.map((row) => [row.value.id, row.value])),
    premiumOrders: Object.fromEntries(ordersResult.map((row) => [row.value.id, row.value])),
    featuredCases: Object.fromEntries(casesResult.map((row) => [row.value.id, row.value])),
    contentSettings: settingsResult[0]?.value,
  });
}

async function upsertJson(table: string, keyColumn: string, key: string, value: unknown, extras: Record<string, string> = {}) {
  const payload = JSON.stringify(value);
  const database = getDatabase();

  if (table === "feed_videos") {
    await database.sql.exec`INSERT INTO feed_videos (id, value) VALUES (${key}, ${payload}::jsonb) ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
  } else if (table === "templates") {
    await database.sql.exec`INSERT INTO templates (slug, value) VALUES (${key}, ${payload}::jsonb) ON CONFLICT (slug) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
  } else if (table === "comments") {
    await database.sql.exec`INSERT INTO comments (id, video_id, value) VALUES (${key}, ${extras.videoId ?? ""}, ${payload}::jsonb) ON CONFLICT (id) DO UPDATE SET video_id = EXCLUDED.video_id, value = EXCLUDED.value`;
  } else if (table === "likes") {
    await database.sql.exec`INSERT INTO likes (id, video_id, session_id, value) VALUES (${key}, ${extras.videoId ?? ""}, ${extras.sessionId ?? ""}, ${payload}::jsonb) ON CONFLICT (id) DO UPDATE SET video_id = EXCLUDED.video_id, session_id = EXCLUDED.session_id, value = EXCLUDED.value`;
  } else if (table === "generations") {
    await database.sql.exec`INSERT INTO generations (id, value) VALUES (${key}, ${payload}::jsonb) ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
  } else if (table === "sessions") {
    await database.sql.exec`INSERT INTO sessions (id, value) VALUES (${key}, ${payload}::jsonb) ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
  } else if (table === "premium_orders") {
    await database.sql.exec`INSERT INTO premium_orders (id, email, receipt, value) VALUES (${key}, ${extras.email ?? ""}, ${extras.receipt ?? ""}, ${payload}::jsonb) ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, receipt = EXCLUDED.receipt, value = EXCLUDED.value, updated_at = NOW()`;
  } else if (table === "featured_cases") {
    await database.sql.exec`INSERT INTO featured_cases (id, value) VALUES (${key}, ${payload}::jsonb) ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
  } else {
    void keyColumn;
  }
}

async function writeDatabaseStore(store: StoreShape) {
  await ensureDatabase();
  const database = getDatabase();
  await database.sql.exec`INSERT INTO kv_store (key, value) VALUES ('content_settings', ${JSON.stringify(store.contentSettings)}::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;

  await Promise.all([
    ...Object.values(store.feedVideos).map((video) => upsertJson("feed_videos", "id", video.id, video)),
    ...Object.values(store.templates).map((template) => upsertJson("templates", "slug", template.slug, template)),
    ...Object.values(store.comments).map((comment) => upsertJson("comments", "id", comment.id, comment, { videoId: comment.videoId })),
    ...Object.values(store.likes).map((like) => upsertJson("likes", "id", like.id, like, { videoId: like.videoId, sessionId: like.sessionId })),
    ...Object.values(store.generations).map((generation) => upsertJson("generations", "id", generation.id, generation)),
    ...Object.values(store.sessions).map((session) => upsertJson("sessions", "id", session.id, session)),
    ...Object.values(store.premiumOrders).map((order) => upsertJson("premium_orders", "id", order.id, order, { email: order.email, receipt: order.receipt })),
    ...Object.values(store.featuredCases).map((item) => upsertJson("featured_cases", "id", item.id, item)),
  ]);
}

async function readStore(): Promise<StoreShape> {
  const now = Date.now();
  if (storeCache && storeCache.expiresAt > now) return storeCache.value;
  const value = usePostgresStore ? await readDatabaseStore() : await readFileStore();
  storeCache = { value, expiresAt: now + STORE_CACHE_TTL_MS };
  return value;
}

async function writeStore(store: StoreShape) {
  clearStoreCache();
  if (usePostgresStore) {
    await writeDatabaseStore(store);
    return;
  }
  await writeFileStore(store);
}

function isRealTemplateUrl(value: string | undefined) {
  const url = value?.trim();
  return Boolean(url && !url.includes("/media/share/placeholder.svg"));
}

function hasPlayableTemplateAsset(template: VideoTemplate) {
  return Boolean(template.isReady && isRealTemplateUrl(template.previewVideoUrl) && isRealTemplateUrl(template.posterUrl));
}

function uniqueStrings(values: string[] | undefined) {
  return Array.from(new Set((values ?? []).filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim())));
}

function normalizeCaseKey(item: Pick<FeaturedCase, "accountName" | "accountUrl" | "title">) {
  const accountUrl = item.accountUrl.trim().toLowerCase().replace(/\/+$/, "");
  if (accountUrl) return `url:${accountUrl}`;
  return `name:${item.accountName.trim().toLowerCase()}|title:${item.title.zh.trim().toLowerCase()}`;
}

function cleanupChineseText(value: string) {
  return value
    .replace(/AI original short drama showcase for Empire of Dust\.\s*/gi, "")
    .replace(/感谢大家喜欢我的原创AI短剧！如果您对其他故事情节感兴趣，欢迎订阅我的频道并查看我的播放列表！/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function empireEpisodeTitleZh(episodeNumber: number | undefined) {
  return `尘埃帝国${episodeNumber ? ` 第${String(episodeNumber).padStart(2, "0")}集` : ""}`;
}

function normalizeFeedVideo(video: FeedVideoItem): FeedVideoItem {
  if (!isEmpireOfDustVideo(video)) return video;
  const episodeNumber = getEpisodeNumber(video);
  return {
    ...video,
    collection: "Empire of Dust",
    discoverCategoryId: "short-drama",
    title: {
      en: video.title.en.replace(/\s*\|\s*/g, " | ").replace(/\bep\s*(\d+)\b/i, (_, value: string) => `Ep ${Number(value)}`),
      zh: empireEpisodeTitleZh(episodeNumber),
    },
    summary: {
      en: video.summary.en,
      zh: cleanupChineseText(video.summary.zh),
    },
    recommendationReason: {
      en: video.recommendationReason.en,
      zh: cleanupChineseText(video.recommendationReason.zh),
    },
  };
}

function getDisplayCountBase(id: string, salt: number) {
  let hash = salt;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 8_000;
  }
  return 1_200 + hash;
}

function getPublicLikesCount(video: FeedVideoItem, actualLikesCount: number) {
  return Math.max(video.likesCount, getDisplayCountBase(video.id, 17)) + actualLikesCount;
}

function getPublicCommentsCount(video: FeedVideoItem, actualCommentsCount: number) {
  return Math.max(video.commentsCount, getDisplayCountBase(video.id, 43)) + actualCommentsCount;
}

function hydrateCounts(store: StoreShape, video: FeedVideoItem): FeedVideoItem {
  const normalizedVideo = normalizeFeedVideo(video);
  const actualLikesCount = Object.values(store.likes).filter((like) => like.videoId === video.id).length;
  const actualCommentsCount = Object.values(store.comments).filter(
    (comment) => comment.videoId === video.id,
  ).length;

  return {
    ...normalizedVideo,
    likesCount: getPublicLikesCount(normalizedVideo, actualLikesCount),
    commentsCount: getPublicCommentsCount(normalizedVideo, actualCommentsCount),
  };
}

function slugify(raw: string) {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || `drama-${nanoid(6).toLowerCase()}`;
}

function normalizeBilingualText(zh: string, en: string): BilingualText {
  return {
    zh: zh.trim(),
    en: en.trim() || zh.trim(),
  };
}

export async function createUploadedVideo(input: {
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  collection: string;
  tags: string[];
  videoUrl: string;
  posterUrl: string;
  discoverCategoryId?: string;
}): Promise<FeedVideoItem> {
  const store = await readStore();
  const nextNumber = Object.keys(store.feedVideos).length + 1;
  const id = `vid_${String(nextNumber).padStart(2, "0")}`;
  const slug = slugify(`${input.collection}-${input.titleEn || input.titleZh}-${nextNumber}`);
  const title = normalizeBilingualText(input.titleZh, input.titleEn);
  const summary = normalizeBilingualText(input.summaryZh, input.summaryEn);
  const isAdUpload = input.discoverCategoryId?.trim() === "ad";
  const tags = input.tags.length ? input.tags : [isAdUpload ? "ad" : "drama"];
  const collection = input.collection.trim() || (isAdUpload ? "Uploaded Ads" : "Uploaded Dramas");

  const common = {
    title,
    summary,
    recommendationReason: isAdUpload
      ? {
          zh: `${title.zh} 已由内部后台上传，可作为独立广告短视频展示。`,
          en: `${title.en} was uploaded from the internal studio and is ready as a standalone ad video.`,
        }
      : {
          zh: `${title.zh} 已由内部后台上传，可作为短剧剧集直接播放。`,
          en: `${title.en} was uploaded from the internal studio and is ready to watch.`,
        },
    useCases: isAdUpload
      ? [
          { zh: "广告展示", en: "Ad showcase" },
          { zh: "带货素材", en: "Commerce creative" },
          { zh: "投放参考", en: "Campaign reference" },
        ]
      : [
          { zh: "短剧播放", en: "Short drama playback" },
          { zh: "会员解锁", en: "Premium unlock" },
          { zh: "剧集连播", en: "Episode playlist" },
        ],
    trendLabel: { zh: "内部上传", en: "Studio upload" },
    remixDifficulty: "easy" as const,
    collection,
    featured: false,
    breakdownSteps: isAdUpload
      ? [
          { zh: "查看广告成片。", en: "Watch the finished ad video." },
          { zh: "拆解产品卖点和画面节奏。", en: "Review the selling points and visual pacing." },
          { zh: "作为广告定制或投放参考。", en: "Use it as a reference for custom ad production or campaigns." },
        ]
      : [
          { zh: "进入剧集播放页。", en: "Open the episode watch page." },
          { zh: "前三集试看，后续剧集由付费墙控制。", en: "The first three episodes are free, then Premium unlock applies." },
          { zh: "会员解锁后继续观看。", en: "Continue watching after Premium unlock." },
        ],
    quickTweaks: [
      { zh: "替换封面", en: "Replace poster" },
      { zh: "调整标题", en: "Update title" },
      { zh: "更新简介", en: "Refresh summary" },
    ],
    posterUrl: input.posterUrl,
    isExternalAsset: false,
    isReady: true,
  };

  const video: FeedVideoItem = {
    id,
    templateSlug: slug,
    ...common,
    videoUrl: input.videoUrl,
    aspectMode: "portrait-9-16",
    likesCount: 0,
    commentsCount: 0,
    seedComments: 0,
    discoverCategoryId: input.discoverCategoryId?.trim() || undefined,
  };

  const template: VideoTemplate = {
    slug,
    ...common,
    previewVideoUrl: input.videoUrl,
    defaultPrompt: isAdUpload
      ? {
          zh: `${title.zh} 的广告短视频。`,
          en: `${title.en} ad video.`,
        }
      : {
          zh: `${title.zh} 的短剧剧集。`,
          en: `${title.en} short-drama episode.`,
        },
    promptFields: {
      subject: title,
      setting: isAdUpload
        ? { zh: "广告上传素材", en: "Uploaded ad asset" }
        : { zh: "短剧上传素材", en: "Uploaded short-drama asset" },
      motion: { zh: "按原视频播放", en: "Play the original video" },
      camera: { zh: "按原视频镜头", en: "Use original camera work" },
      finish: { zh: "保留原成片效果", en: "Keep original final look" },
    },
    requestedModels: ["kling", "veo3", "seedance2"],
    executionProvider: "kling",
    tags,
  };

  store.feedVideos[id] = video;
  store.templates[slug] = template;
  await writeStore(store);
  return hydrateCounts(store, video);
}

function applyVideoOrder(videos: FeedVideoItem[], order: string[], hiddenIds: string[] = []) {
  const hidden = new Set(hiddenIds);
  const visibleVideos = videos.filter((video) => !hidden.has(video.id));
  if (!order.length) return visibleVideos;
  const byId = new Map(visibleVideos.map((video) => [video.id, video]));
  const ordered = order
    .map((id) => byId.get(id))
    .filter((video): video is FeedVideoItem => Boolean(video));
  const orderedIds = new Set(ordered.map((video) => video.id));
  const rest = visibleVideos.filter((video) => !orderedIds.has(video.id));
  return [...ordered, ...rest];
}

function uniqueHomeEntries(videos: FeedVideoItem[]) {
  const byId = new Map(videos.map((video) => [video.id, video]));
  const included = new Set<string>();
  const result: FeedVideoItem[] = [];

  for (const video of videos) {
    const displayVideo = isStandaloneVideo(video) ? video : getFirstEpisodeForVideo(video, videos);
    if (!byId.has(displayVideo.id) || included.has(displayVideo.id)) continue;
    included.add(displayVideo.id);
    result.push(displayVideo);
  }

  return result;
}

export async function getHomeFeedVideos() {
  const store = await readStore();
  const videos = Object.values(store.feedVideos)
    .filter((video) => video.isReady && hasPlayableAsset(video))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    .map((video) => hydrateCounts(store, video));
  const ordered = applyVideoOrder(videos, store.contentSettings.homeVideoOrder, store.contentSettings.homeVideoHiddenIds);
  return uniqueHomeEntries(ordered);
}

export async function getDiscoverFeedVideos() {
  const store = await readStore();
  const videos = Object.values(store.feedVideos)
    .filter((video) => video.isReady && hasPlayableAsset(video))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    .map((video) => hydrateCounts(store, video));
  const ordered = applyVideoOrder(videos, store.contentSettings.discoverVideoOrder, store.contentSettings.discoverVideoHiddenIds);
  return uniqueHomeEntries(ordered);
}

export async function getAllFeedVideos() {
  const store = await readStore();
  return Object.values(store.feedVideos)
    .filter((video) => video.isReady && hasPlayableAsset(video))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    .map((video) => hydrateCounts(store, video));
}

export async function getDiscoverCategories() {
  const store = await readStore();
  return store.contentSettings.discoverCategories;
}

export async function getFeaturedCases() {
  const store = await readStore();
  const cases = Object.values(store.featuredCases).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  const uniqueCases = Array.from(
    cases.reduce((map, item) => {
      const key = normalizeCaseKey(item);
      if (!map.has(key)) map.set(key, item);
      return map;
    }, new Map<string, FeaturedCase>()).values(),
  );
  if (!store.contentSettings.featuredCaseOrder.length) return uniqueCases;
  const byId = new Map(uniqueCases.map((item) => [item.id, item]));
  const ordered = uniqueStrings(store.contentSettings.featuredCaseOrder)
    .map((id) => byId.get(id))
    .filter((item): item is FeaturedCase => Boolean(item));
  const orderedIds = new Set(ordered.map((item) => item.id));
  return [...ordered, ...uniqueCases.filter((item) => !orderedIds.has(item.id))];
}

export async function getAdminContentSnapshot() {
  const store = await readStore();
  const videos = Object.values(store.feedVideos)
    .filter((video) => video.isReady)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((video) => hydrateCounts(store, video));
  const featuredCases = await getFeaturedCases();
  return {
    videos,
    contentSettings: {
      ...store.contentSettings,
      featuredCaseOrder: uniqueStrings(store.contentSettings.featuredCaseOrder),
    },
    featuredCases,
  };
}

export async function updateContentSettings(input: Partial<ContentSettings>) {
  const store = await readStore();
  store.contentSettings = {
    ...store.contentSettings,
    ...input,
    discoverCategories: input.discoverCategories
      ? normalizeDiscoverCategories(input.discoverCategories)
      : store.contentSettings.discoverCategories,
    featuredCaseOrder: uniqueStrings(input.featuredCaseOrder ?? store.contentSettings.featuredCaseOrder),
  };
  await writeStore(store);
  return store.contentSettings;
}

export async function createFeaturedCase(input: {
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  accountName: string;
  followers: string;
  totalViews: string;
  accountUrl: string;
  screenshotUrl: string;
}) {
  const store = await readStore();
  const now = new Date().toISOString();
  const item: FeaturedCase = {
    id: `case_${nanoid(12)}`,
    title: normalizeBilingualText(input.titleZh, input.titleEn),
    summary: normalizeBilingualText(input.summaryZh, input.summaryEn),
    accountName: input.accountName.trim(),
    followers: input.followers.trim(),
    totalViews: input.totalViews.trim(),
    accountUrl: input.accountUrl.trim(),
    screenshotUrl: input.screenshotUrl,
    createdAt: now,
    updatedAt: now,
  };
  const existing = Object.values(store.featuredCases).find(
    (featuredCase) => normalizeCaseKey(featuredCase) === normalizeCaseKey(item),
  );
  if (existing) {
    store.featuredCases[existing.id] = {
      ...existing,
      ...item,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now,
    };
    store.contentSettings.featuredCaseOrder = uniqueStrings([
      existing.id,
      ...store.contentSettings.featuredCaseOrder,
    ]);
    await writeStore(store);
    return store.featuredCases[existing.id];
  }
  store.featuredCases[item.id] = item;
  store.contentSettings.featuredCaseOrder = uniqueStrings([...store.contentSettings.featuredCaseOrder, item.id]);
  await writeStore(store);
  return item;
}

async function deleteDatabaseFeaturedCases(caseIds: string[]) {
  await ensureDatabase();
  const database = getDatabase();
  for (const id of caseIds) {
    await database.sql.exec`DELETE FROM featured_cases WHERE id = ${id}`;
  }
}

export async function deleteFeaturedCase(caseId: string) {
  const store = await readStore();
  const target = store.featuredCases[caseId];
  if (!target) return null;
  const targetKey = normalizeCaseKey(target);
  const caseIds = Object.values(store.featuredCases)
    .filter((item) => item.id === caseId || normalizeCaseKey(item) === targetKey)
    .map((item) => item.id);
  for (const id of caseIds) {
    delete store.featuredCases[id];
  }
  const deletedSet = new Set(caseIds);
  store.contentSettings.featuredCaseOrder = uniqueStrings(store.contentSettings.featuredCaseOrder).filter((id) => !deletedSet.has(id));
  if (usePostgresStore) {
    clearStoreCache();
    await deleteDatabaseFeaturedCases(caseIds);
    await writeDatabaseStore(store);
  } else {
    await writeStore(store);
  }
  return { id: caseId, deletedIds: caseIds };
}

export async function getFeedVideos() {
  return getHomeFeedVideos();
}

export async function getFeedVideoById(videoId: string) {
  const store = await readStore();
  const video = store.feedVideos[videoId];
  if (!video || !video.isReady || !hasPlayableAsset(video)) return null;
  return hydrateCounts(store, video);
}

export async function getTemplates() {
  const store = await readStore();
  return Object.values(store.templates)
    .filter(hasPlayableTemplateAsset)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function getTemplateBySlug(slug: string) {
  const store = await readStore();
  const template = store.templates[slug] ?? null;
  return template && hasPlayableTemplateAsset(template) ? template : null;
}

export async function ensureSession(sessionId: string) {
  const store = await readStore();
  const now = new Date().toISOString();

  store.sessions[sessionId] = store.sessions[sessionId]
    ? {
        ...store.sessions[sessionId],
        updatedAt: now,
      }
    : {
        id: sessionId,
        createdAt: now,
        updatedAt: now,
      };

  await writeStore(store);
  return store.sessions[sessionId];
}

export async function toggleLike(videoId: string, sessionId: string) {
  const store = await readStore();
  const video = store.feedVideos[videoId];
  if (!video || !video.isReady) {
    return null;
  }

  store.sessions[sessionId] = store.sessions[sessionId]
    ? {
        ...store.sessions[sessionId],
        updatedAt: new Date().toISOString(),
      }
    : {
        id: sessionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

  const existing = Object.values(store.likes).find(
    (like) => like.videoId === videoId && like.sessionId === sessionId,
  );

  let liked = false;

  if (existing) {
    delete store.likes[existing.id];
  } else {
    const like: VideoLike = {
      id: `like_${nanoid(12)}`,
      videoId,
      sessionId,
      createdAt: new Date().toISOString(),
    };
    store.likes[like.id] = like;
    liked = true;
  }

  await writeStore(store);

  const likesCount = getPublicLikesCount(video, Object.values(store.likes).filter((like) => like.videoId === videoId).length);

  return {
    liked,
    likesCount,
  };
}

export async function getComments(videoId: string) {
  const store = await readStore();
  const video = store.feedVideos[videoId];
  if (!video || !video.isReady) {
    return null;
  }

  const comments = Object.values(store.comments)
    .filter((comment) => comment.videoId === videoId)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return {
    comments,
    commentsCount: getPublicCommentsCount(video, comments.length),
  };
}

export async function addComment(videoId: string, input: CreateCommentRequest) {
  const store = await readStore();
  const video = store.feedVideos[videoId];
  if (!video || !video.isReady) {
    return null;
  }

  store.sessions[input.sessionId] = store.sessions[input.sessionId]
    ? {
        ...store.sessions[input.sessionId],
        updatedAt: new Date().toISOString(),
      }
    : {
        id: input.sessionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

  const comment: VideoComment = {
    id: `cmt_${nanoid(12)}`,
    videoId,
    nickname: input.nickname,
    body: input.body,
    createdAt: new Date().toISOString(),
    seed: false,
  };

  store.comments[comment.id] = comment;
  await writeStore(store);

  return comment;
}

export async function createGeneration(input: GenerationRequest) {
  const store = await readStore();
  const template = store.templates[input.templateSlug];
  if (!template) {
    throw new Error("Template not found");
  }

  store.sessions[input.sessionId] = store.sessions[input.sessionId]
    ? {
        ...store.sessions[input.sessionId],
        updatedAt: new Date().toISOString(),
      }
    : {
        id: input.sessionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

  const generation: GenerationRecord = {
    id: `gen_${nanoid(12)}`,
    sessionId: input.sessionId,
    templateSlug: input.templateSlug,
    requestedModel: input.requestedModel,
    executionProvider: "kling",
    promptOverride: input.promptOverride,
    status: "queued",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.generations[generation.id] = generation;
  await writeStore(store);

  return generation;
}

export async function updateGeneration(
  generationId: string,
  updates: Partial<GenerationRecord>,
) {
  const store = await readStore();
  const generation = store.generations[generationId];
  if (!generation) return null;

  store.generations[generationId] = {
    ...generation,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await writeStore(store);
  return store.generations[generationId];
}

export async function getGeneration(generationId: string) {
  const store = await readStore();
  return store.generations[generationId] ?? null;
}

export async function findGenerationByProviderJobId(providerJobId: string) {
  const store = await readStore();
  return (
    Object.values(store.generations).find(
      (generation) => generation.providerJobId === providerJobId,
    ) ?? null
  );
}

export async function setGenerationStatus(
  generationId: string,
  status: GenerationStatus,
  extras?: Partial<GenerationRecord>,
) {
  return updateGeneration(generationId, {
    status,
    ...(extras ?? {}),
  });
}

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

const PREMIUM_PASS_DAYS = 7;
const PREMIUM_PASS_AMOUNT_MINOR = 299;
const PREMIUM_PASS_CURRENCY = "usd";
const PREMIUM_PASS_PRODUCT_NAME = "Short Drama Premium / 短剧会员解锁";

function createPassExpiry(now = new Date()) {
  return new Date(now.getTime() + PREMIUM_PASS_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

function isOrderActive(order: PremiumOrder) {
  return order.status === "approved" && (!order.expiresAt || Date.parse(order.expiresAt) > Date.now());
}

export async function createPremiumOrder(input: {
  email: string;
  receipt: string;
  note?: string;
  expiresAt?: string;
  amountMinor?: number;
  currency?: string;
  productName?: string;
  source?: PremiumOrder["source"];
}): Promise<PremiumOrder> {
  const store = await readStore();
  const now = new Date().toISOString();
  const expiresAt = input.expiresAt ?? createPassExpiry(new Date(now));
  const order: PremiumOrder = {
    id: `ord_${nanoid(12)}`,
    email: normalizeEmail(input.email),
    receipt: input.receipt.trim(),
    note: input.note?.trim() || undefined,
    status: "approved",
    createdAt: now,
    updatedAt: now,
    expiresAt,
    amountMinor: input.amountMinor ?? PREMIUM_PASS_AMOUNT_MINOR,
    currency: input.currency ?? PREMIUM_PASS_CURRENCY,
    productName: input.productName ?? PREMIUM_PASS_PRODUCT_NAME,
    source: input.source ?? "manual",
  };
  store.premiumOrders[order.id] = order;
  await writeStore(store);
  return order;
}

export async function listPremiumOrders(
  status?: PremiumOrderStatus,
): Promise<PremiumOrder[]> {
  const store = await readStore();
  const all = Object.values(store.premiumOrders);
  const filtered = status ? all.filter((order) => order.status === status) : all;
  return filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function updatePremiumOrderStatus(
  id: string,
  status: PremiumOrderStatus,
  reviewerNote?: string,
): Promise<PremiumOrder | null> {
  const store = await readStore();
  const existing = store.premiumOrders[id];
  if (!existing) return null;
  const next: PremiumOrder = {
    ...existing,
    status,
    reviewerNote: reviewerNote?.trim() || existing.reviewerNote,
    updatedAt: new Date().toISOString(),
  };
  store.premiumOrders[id] = next;
  await writeStore(store);
  return next;
}

export async function isEmailPremium(email: string): Promise<boolean> {
  if (!email) return false;
  const store = await readStore();
  const normalized = normalizeEmail(email);
  return Object.values(store.premiumOrders).some(
    (order) => order.email === normalized && isOrderActive(order),
  );
}

export async function findLatestOrderByEmail(
  email: string,
): Promise<PremiumOrder | null> {
  if (!email) return null;
  const store = await readStore();
  const normalized = normalizeEmail(email);
  const matches = Object.values(store.premiumOrders)
    .filter((order) => order.email === normalized)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return matches[0] ?? null;
}

export async function createAgentRevenuePremiumOrder(input: {
  email: string;
  paymentId: string;
  amountMinor?: number;
  currency?: string;
  productName?: string;
}): Promise<PremiumOrder> {
  const store = await readStore();
  const normalized = normalizeEmail(input.email);
  const existing = Object.values(store.premiumOrders).find(
    (order) => order.source === "agent-revenue" && order.receipt === input.paymentId,
  );
  if (existing) return existing;

  const now = new Date().toISOString();
  const order: PremiumOrder = {
    id: `ord_${nanoid(12)}`,
    email: normalized,
    receipt: input.paymentId,
    status: "approved",
    createdAt: now,
    updatedAt: now,
    expiresAt: createPassExpiry(new Date(now)),
    amountMinor: input.amountMinor ?? PREMIUM_PASS_AMOUNT_MINOR,
    currency: input.currency ?? PREMIUM_PASS_CURRENCY,
    productName: input.productName ?? PREMIUM_PASS_PRODUCT_NAME,
    source: "agent-revenue",
  };
  store.premiumOrders[order.id] = order;
  await writeStore(store);
  return order;
}
