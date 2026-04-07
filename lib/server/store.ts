import { promises as fs } from "node:fs";
import path from "node:path";

import { nanoid } from "nanoid";

import { makeInitialStore } from "@/lib/seed-data";
import {
  type CreateCommentRequest,
  type FeedVideoItem,
  type GenerationRecord,
  type GenerationRequest,
  type GenerationStatus,
  type StoreShape,
  type VideoComment,
  type VideoLike,
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

  if (
    !parsed.feedVideos ||
    !parsed.templates ||
    !parsed.comments ||
    !parsed.likes ||
    !parsed.generations ||
    !parsed.sessions
  ) {
    const next = makeInitialStore();
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

export async function getFeedVideos() {
  const store = await readStore();
  return Object.values(store.feedVideos)
    .filter((video) => video.isReady)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((video) => hydrateCounts(store, video));
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
