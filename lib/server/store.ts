import { promises as fs } from "node:fs";
import path from "node:path";

import { nanoid } from "nanoid";

import { makeInitialStore } from "@/lib/seed-data";
import { normalizeDiscoverCategories } from "@/lib/discover-categories";
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

async function readStore(): Promise<StoreShape> {
  await ensureStoreFile();
  const content = await fs.readFile(dataFile, "utf8");
  const parsed = JSON.parse(content) as Partial<StoreShape>;
  const initial = makeInitialStore();

  if (
    !parsed.feedVideos ||
    !parsed.templates ||
    !parsed.comments ||
    !parsed.likes ||
    !parsed.generations ||
    !parsed.sessions
  ) {
    await writeStore(initial);
    return initial;
  }

  if (!parsed.premiumOrders) {
    parsed.premiumOrders = {};
  }
  if (!parsed.featuredCases) {
    parsed.featuredCases = {};
  }
  if (!parsed.contentSettings) {
    parsed.contentSettings = initial.contentSettings;
  }
  parsed.contentSettings = {
    ...initial.contentSettings,
    ...parsed.contentSettings,
    discoverCategories: normalizeDiscoverCategories(parsed.contentSettings.discoverCategories),
  };

  const hasRichFeedShape = Object.values(parsed.feedVideos).every(
    (video) =>
      video &&
      typeof video === "object" &&
      "summary" in video &&
      "recommendationReason" in video &&
      "useCases" in video &&
      "breakdownSteps" in video,
  );
  const hasRichTemplateShape = Object.values(parsed.templates).every(
    (template) =>
      template &&
      typeof template === "object" &&
      "summary" in template &&
      "promptFields" in template &&
      "quickTweaks" in template,
  );

  if (!hasRichFeedShape || !hasRichTemplateShape) {
    const next: StoreShape = {
      ...initial,
      comments: parsed.comments ?? initial.comments,
      likes: parsed.likes ?? initial.likes,
      generations: parsed.generations ?? initial.generations,
      sessions: parsed.sessions ?? initial.sessions,
      premiumOrders: parsed.premiumOrders ?? initial.premiumOrders,
      featuredCases: parsed.featuredCases ?? initial.featuredCases,
      contentSettings: parsed.contentSettings ?? initial.contentSettings,
    };
    await writeStore(next);
    return next;
  }

  return parsed as StoreShape;
}

async function writeStore(store: StoreShape) {
  await fs.writeFile(dataFile, JSON.stringify(store, null, 2), "utf8");
}

function hydrateCounts(store: StoreShape, video: FeedVideoItem): FeedVideoItem {
  const likesCount = Object.values(store.likes).filter((like) => like.videoId === video.id).length;
  const commentsCount = Object.values(store.comments).filter(
    (comment) => comment.videoId === video.id,
  ).length;

  return {
    ...video,
    likesCount,
    commentsCount,
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
}): Promise<FeedVideoItem> {
  const store = await readStore();
  const nextNumber = Object.keys(store.feedVideos).length + 1;
  const id = `vid_${String(nextNumber).padStart(2, "0")}`;
  const slug = slugify(`${input.collection}-${input.titleEn || input.titleZh}-${nextNumber}`);
  const title = normalizeBilingualText(input.titleZh, input.titleEn);
  const summary = normalizeBilingualText(input.summaryZh, input.summaryEn);
  const tags = input.tags.length ? input.tags : ["drama"];
  const collection = input.collection.trim() || "Uploaded Dramas";

  const common = {
    title,
    summary,
    recommendationReason: {
      zh: `${title.zh} 已由内部后台上传，可作为短剧剧集直接播放。`,
      en: `${title.en} was uploaded from the internal studio and is ready to watch.`,
    },
    useCases: [
      { zh: "短剧播放", en: "Short drama playback" },
      { zh: "会员解锁", en: "Premium unlock" },
      { zh: "剧集连播", en: "Episode playlist" },
    ],
    trendLabel: { zh: "内部上传", en: "Studio upload" },
    remixDifficulty: "easy" as const,
    collection,
    featured: false,
    breakdownSteps: [
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
  };

  const template: VideoTemplate = {
    slug,
    ...common,
    previewVideoUrl: input.videoUrl,
    defaultPrompt: {
      zh: `${title.zh} 的短剧剧集。`,
      en: `${title.en} short-drama episode.`,
    },
    promptFields: {
      subject: title,
      setting: { zh: "短剧上传素材", en: "Uploaded short-drama asset" },
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

export async function getHomeFeedVideos() {
  const store = await readStore();
  const videos = Object.values(store.feedVideos)
    .filter((video) => video.isReady)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((video) => hydrateCounts(store, video));
  return applyVideoOrder(videos, store.contentSettings.homeVideoOrder, store.contentSettings.homeVideoHiddenIds);
}

export async function getDiscoverFeedVideos() {
  const store = await readStore();
  const videos = Object.values(store.feedVideos)
    .filter((video) => video.isReady)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((video) => hydrateCounts(store, video));
  return applyVideoOrder(videos, store.contentSettings.discoverVideoOrder, store.contentSettings.discoverVideoHiddenIds);
}

export async function getDiscoverCategories() {
  const store = await readStore();
  return store.contentSettings.discoverCategories;
}

export async function getFeaturedCases() {
  const store = await readStore();
  const cases = Object.values(store.featuredCases).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  if (!store.contentSettings.featuredCaseOrder.length) return cases;
  const byId = new Map(cases.map((item) => [item.id, item]));
  const ordered = store.contentSettings.featuredCaseOrder
    .map((id) => byId.get(id))
    .filter((item): item is FeaturedCase => Boolean(item));
  const orderedIds = new Set(ordered.map((item) => item.id));
  return [...ordered, ...cases.filter((item) => !orderedIds.has(item.id))];
}

export async function getAdminContentSnapshot() {
  const store = await readStore();
  const videos = Object.values(store.feedVideos)
    .filter((video) => video.isReady)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((video) => hydrateCounts(store, video));
  return {
    videos,
    contentSettings: store.contentSettings,
    featuredCases: await getFeaturedCases(),
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
  store.featuredCases[item.id] = item;
  store.contentSettings.featuredCaseOrder = [...store.contentSettings.featuredCaseOrder, item.id];
  await writeStore(store);
  return item;
}

export async function getFeedVideos() {
  return getHomeFeedVideos();
}

export async function getFeedVideoById(videoId: string) {
  const store = await readStore();
  const video = store.feedVideos[videoId];
  if (!video) return null;
  return hydrateCounts(store, video);
}

export async function getTemplates() {
  const store = await readStore();
  return Object.values(store.templates).sort((a, b) => a.slug.localeCompare(b.slug));
}

export async function getTemplateBySlug(slug: string) {
  const store = await readStore();
  return store.templates[slug] ?? null;
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

  const likesCount = Object.values(store.likes).filter((like) => like.videoId === videoId).length;

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
    commentsCount: comments.length,
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
