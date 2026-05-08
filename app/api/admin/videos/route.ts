import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

import {
  createFeaturedCase,
  createUploadedVideo,
  getAdminContentSnapshot,
  updateContentSettings,
} from "@/lib/server/store";
import type { ContentSettings, DiscoverCategory } from "@/lib/types";

const ADMIN_HEADER = "x-admin-token";
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const MAX_POSTER_BYTES = 10 * 1024 * 1024;
const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/ogg"]);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function isAdmin(request: Request) {
  const token = request.headers.get(ADMIN_HEADER);
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(token && expected && token === expected);
}

function extensionFor(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  if (file.type === "video/mp4") return "mp4";
  if (file.type === "video/webm") return "webm";
  if (file.type === "video/ogg") return "ogv";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "bin";
}

async function saveUpload(file: File, folder: "videos" | "posters" | "cases") {
  const filename = `uploads/${folder}/${Date.now()}-${nanoid(10)}.${extensionFor(file)}`;
  const blob = await put(filename, file, {
    access: "public",
    addRandomSuffix: false,
  });
  return blob.url;
}

function sanitizeDiscoverCategories(value: unknown): DiscoverCategory[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const categories: DiscoverCategory[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const category = item as Partial<DiscoverCategory>;
    categories.push({
      id: typeof category.id === "string" ? category.id : "",
      title: {
        zh: typeof category.title?.zh === "string" ? category.title.zh : "",
        en: typeof category.title?.en === "string" ? category.title.en : "",
      },
      match: typeof category.match === "string" ? category.match : undefined,
      locked: category.locked === true,
    });
  }
  return categories;
}

export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getAdminContentSnapshot());
}

export async function PATCH(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Partial<ContentSettings> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const next = await updateContentSettings({
    homeVideoOrder: Array.isArray(body.homeVideoOrder) ? body.homeVideoOrder.filter((id) => typeof id === "string") : undefined,
    homeVideoHiddenIds: Array.isArray(body.homeVideoHiddenIds) ? body.homeVideoHiddenIds.filter((id) => typeof id === "string") : undefined,
    discoverVideoOrder: Array.isArray(body.discoverVideoOrder) ? body.discoverVideoOrder.filter((id) => typeof id === "string") : undefined,
    discoverVideoHiddenIds: Array.isArray(body.discoverVideoHiddenIds) ? body.discoverVideoHiddenIds.filter((id) => typeof id === "string") : undefined,
    discoverCategories: sanitizeDiscoverCategories(body.discoverCategories),
    featuredCaseOrder: Array.isArray(body.featuredCaseOrder) ? body.featuredCaseOrder.filter((id) => typeof id === "string") : undefined,
  });

  return NextResponse.json({ contentSettings: next });
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const kind = String(formData.get("kind") ?? "video");

  if (kind === "featured-case") {
    const titleZh = String(formData.get("titleZh") ?? "").trim();
    const titleEn = String(formData.get("titleEn") ?? "").trim();
    const summaryZh = String(formData.get("summaryZh") ?? "").trim();
    const summaryEn = String(formData.get("summaryEn") ?? "").trim();
    const accountName = String(formData.get("accountName") ?? "").trim();
    const followers = String(formData.get("followers") ?? "").trim();
    const totalViews = String(formData.get("totalViews") ?? "").trim();
    const accountUrl = String(formData.get("accountUrl") ?? "").trim();
    const screenshot = formData.get("screenshot");

    if (!titleZh || !summaryZh || !accountName || !followers || !totalViews || !accountUrl) {
      return NextResponse.json({ error: "Missing featured case fields" }, { status: 400 });
    }
    if (!(screenshot instanceof File) || !ALLOWED_IMAGE_TYPES.has(screenshot.type) || screenshot.size > MAX_SCREENSHOT_BYTES) {
      return NextResponse.json({ error: "Invalid account screenshot" }, { status: 400 });
    }

    const screenshotUrl = await saveUpload(screenshot, "cases");
    const featuredCase = await createFeaturedCase({
      titleZh,
      titleEn,
      summaryZh,
      summaryEn,
      accountName,
      followers,
      totalViews,
      accountUrl,
      screenshotUrl,
    });

    return NextResponse.json({ featuredCase });
  }

  const titleZh = String(formData.get("titleZh") ?? "").trim();
  const titleEn = String(formData.get("titleEn") ?? "").trim();
  const summaryZh = String(formData.get("summaryZh") ?? "").trim();
  const summaryEn = String(formData.get("summaryEn") ?? "").trim();
  const collection = String(formData.get("collection") ?? "").trim();
  const tags = String(formData.get("tags") ?? "")
    .split(/[，,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  const video = formData.get("video");
  const poster = formData.get("poster");

  if (!titleZh || !summaryZh || !collection) {
    return NextResponse.json({ error: "Missing required text fields" }, { status: 400 });
  }
  if (!(video instanceof File) || !(poster instanceof File)) {
    return NextResponse.json({ error: "Missing video or poster file" }, { status: 400 });
  }
  if (!ALLOWED_VIDEO_TYPES.has(video.type) || video.size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: "Invalid video file" }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.has(poster.type) || poster.size > MAX_POSTER_BYTES) {
    return NextResponse.json({ error: "Invalid poster file" }, { status: 400 });
  }

  const [videoUrl, posterUrl] = await Promise.all([
    saveUpload(video, "videos"),
    saveUpload(poster, "posters"),
  ]);

  const uploaded = await createUploadedVideo({
    titleZh,
    titleEn,
    summaryZh,
    summaryEn,
    collection,
    tags,
    videoUrl,
    posterUrl,
  });

  return NextResponse.json({ video: uploaded });
}
