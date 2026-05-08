export const locales = ["en", "zh"] as const;

export type Locale = (typeof locales)[number];

export const requestedModels = ["kling", "veo3", "seedance2"] as const;

export type RequestedModel = (typeof requestedModels)[number];

export const executionProviders = ["kling"] as const;

export type ExecutionProvider = (typeof executionProviders)[number];

export const aspectModes = ["portrait-9-16"] as const;

export type AspectMode = (typeof aspectModes)[number];

export const generationStatuses = [
  "queued",
  "generating",
  "ready",
  "failed",
] as const;

export type GenerationStatus = (typeof generationStatuses)[number];

export type BilingualText = {
  en: string;
  zh: string;
};

export type PromptFieldKey =
  | "subject"
  | "setting"
  | "motion"
  | "camera"
  | "finish";

export type PromptFieldSet = Record<PromptFieldKey, BilingualText>;

export type RemixDifficulty = "easy" | "medium" | "advanced";

export type FeedVideoItem = {
  id: string;
  templateSlug: string;
  title: BilingualText;
  summary: BilingualText;
  recommendationReason: BilingualText;
  useCases: BilingualText[];
  trendLabel: BilingualText;
  remixDifficulty: RemixDifficulty;
  collection: string;
  featured: boolean;
  breakdownSteps: BilingualText[];
  quickTweaks: BilingualText[];
  videoUrl: string;
  posterUrl: string;
  aspectMode: AspectMode;
  likesCount: number;
  commentsCount: number;
  seedComments: number;
  isExternalAsset: boolean;
  isReady: boolean;
  discoverCategoryId?: string;
};

export type VideoTemplate = {
  slug: string;
  title: BilingualText;
  summary: BilingualText;
  recommendationReason: BilingualText;
  useCases: BilingualText[];
  trendLabel: BilingualText;
  remixDifficulty: RemixDifficulty;
  collection: string;
  featured: boolean;
  breakdownSteps: BilingualText[];
  quickTweaks: BilingualText[];
  previewVideoUrl: string;
  posterUrl: string;
  defaultPrompt: BilingualText;
  promptFields: PromptFieldSet;
  requestedModels: RequestedModel[];
  executionProvider: ExecutionProvider;
  tags: string[];
  isExternalAsset: boolean;
  isReady: boolean;
};

export type VideoComment = {
  id: string;
  videoId: string;
  nickname: string;
  body: string;
  createdAt: string;
  seed: boolean;
};

export type VideoLike = {
  id: string;
  videoId: string;
  sessionId: string;
  createdAt: string;
};

export type GenerationRequest = {
  sessionId: string;
  templateSlug: string;
  requestedModel: RequestedModel;
  promptOverride: string;
};

export type GenerationRecord = {
  id: string;
  sessionId: string;
  templateSlug: string;
  requestedModel: RequestedModel;
  executionProvider: ExecutionProvider;
  promptOverride: string;
  providerJobId?: string;
  status: GenerationStatus;
  outputUrl?: string;
  previewUrl?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type FeedResponse = {
  videos: FeedVideoItem[];
};

export type TemplatesResponse = {
  templates: VideoTemplate[];
};

export type CreateCommentRequest = {
  sessionId: string;
  nickname: string;
  body: string;
};

export type LikeResponse = {
  liked: boolean;
  likesCount: number;
};

export type CommentsResponse = {
  comments: VideoComment[];
  commentsCount: number;
};

export type GenerateResponse = {
  generation: GenerationRecord;
};

export type PremiumOrderStatus = "approved" | "rejected";

export type PremiumOrder = {
  id: string;
  email: string;
  receipt: string;
  note?: string;
  status: PremiumOrderStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  amountMinor?: number;
  currency?: string;
  productName?: string;
  source?: "manual" | "agent-revenue";
  reviewerNote?: string;
};

export type FeaturedCase = {
  id: string;
  title: BilingualText;
  summary: BilingualText;
  accountName: string;
  followers: string;
  totalViews: string;
  accountUrl: string;
  screenshotUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type DiscoverCategory = {
  id: string;
  title: BilingualText;
  match?: string;
  locked?: boolean;
};

export type ContentSettings = {
  homeVideoOrder: string[];
  homeVideoHiddenIds: string[];
  discoverVideoOrder: string[];
  discoverVideoHiddenIds: string[];
  discoverCategories: DiscoverCategory[];
  featuredCaseOrder: string[];
};

export type StoreShape = {
  feedVideos: Record<string, FeedVideoItem>;
  templates: Record<string, VideoTemplate>;
  comments: Record<string, VideoComment>;
  likes: Record<string, VideoLike>;
  generations: Record<string, GenerationRecord>;
  sessions: Record<string, { id: string; createdAt: string; updatedAt: string }>;
  premiumOrders: Record<string, PremiumOrder>;
  featuredCases: Record<string, FeaturedCase>;
  contentSettings: ContentSettings;
};
