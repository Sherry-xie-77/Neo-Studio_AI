import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

import {
  createFeaturedCase,
  createUploadedVideo,
  deleteFeaturedCase,
  getAdminContentSnapshot,
  updateContentSettings,
} from "@/lib/server/store";
import type { ContentSettings, DiscoverCategory } from "@/lib/types";

const ADMIN_HEADER = "x-admin-token";
const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;
const MAX_POSTER_BYTES = 10 * 1024 * 1024;
const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/ogg"]);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_VIDEO_MB = MAX_VIDEO_BYTES / 1024 / 1024;
const MAX_POSTER_MB = MAX_POSTER_BYTES / 1024 / 1024;
const MAX_SCREENSHOT_MB = MAX_SCREENSHOT_BYTES / 1024 / 1024;

function uploadError(error: string, details?: string, status = 400) {
  return NextResponse.json(details ? { error, details } : { error }, { status });
}

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

export async function DELETE(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get("caseId")?.trim();
  if (!caseId) {
    return NextResponse.json({ error: "Missing caseId" }, { status: 400 });
  }

  const deleted = await deleteFeaturedCase(caseId);
  if (!deleted) {
    return NextResponse.json({ error: "Featured case not found" }, { status: 404 });
  }

  return NextResponse.json({ deleted });
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as {
      kind?: string;
      titleZh?: string;
      titleEn?: string;
      summaryZh?: string;
      summaryEn?: string;
      collection?: string;
      discoverCategoryId?: string;
      tags?: string;
      videoUrl?: string;
      posterUrl?: string;
    } | null;

    if (!body || body.kind !== "video-from-blob") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const titleZh = String(body.titleZh ?? "").trim();
    const titleEn = String(body.titleEn ?? "").trim();
    const summaryZh = String(body.summaryZh ?? "").trim();
    const summaryEn = String(body.summaryEn ?? "").trim();
    const collection = String(body.collection ?? "").trim();
    const discoverCategoryId = String(body.discoverCategoryId ?? "").trim() || undefined;
    const videoUrl = String(body.videoUrl ?? "").trim();
    const posterUrl = String(body.posterUrl ?? "").trim();
    const tags = String(body.tags ?? "")
      .split(/[，,]/)
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (!titleZh || !summaryZh || !collection || !videoUrl || !posterUrl) {
      return uploadError("缺少必填字段", "请填写中文标题、中文简介、合集名称，并确保视频和封面已上传成功。Missing titleZh, summaryZh, collection, videoUrl, or posterUrl.");
    }
    if (!URL.canParse(videoUrl) || !URL.canParse(posterUrl)) {
      return uploadError("素材链接无效", "视频或封面上传后返回的 URL 无效，请重新上传。Invalid videoUrl or posterUrl.");
    }

    const uploaded = await createUploadedVideo({
      titleZh,
      titleEn,
      summaryZh,
      summaryEn,
      collection,
      tags,
      videoUrl,
      posterUrl,
      discoverCategoryId,
    });

    return NextResponse.json({ video: uploaded });
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
      return uploadError("缺少成功案例字段", "请填写中文案例标题、中文简介、账号名称、粉丝数、总曝光量和账号跳转链接。Missing featured case fields.");
    }
    if (!(screenshot instanceof File)) {
      return uploadError("账号截图无效", "请上传 JPG、PNG 或 WebP 图片。Missing account screenshot file.");
    }
    if (!ALLOWED_IMAGE_TYPES.has(screenshot.type)) {
      return uploadError("账号截图格式不支持", `当前格式：${screenshot.type || "unknown"}。请上传 JPG、PNG 或 WebP 图片。`);
    }
    if (screenshot.size > MAX_SCREENSHOT_BYTES) {
      return uploadError("账号截图太大", `当前大小约 ${(screenshot.size / 1024 / 1024).toFixed(1)}MB，最大支持 ${MAX_SCREENSHOT_MB}MB。`);
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
  const discoverCategoryId = String(formData.get("discoverCategoryId") ?? "").trim() || undefined;
  const tags = String(formData.get("tags") ?? "")
    .split(/[，,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  const video = formData.get("video");
  const poster = formData.get("poster");

  if (!titleZh || !summaryZh || !collection) {
    return uploadError("缺少必填文字字段", "请填写中文标题、中文简介和短剧/合集名称。Missing titleZh, summaryZh, or collection.");
  }
  if (!(video instanceof File)) {
    return uploadError("缺少视频文件", "请重新选择一个 MP4、WebM 或 OGG 视频文件。Missing video file.");
  }
  if (!(poster instanceof File)) {
    return uploadError("缺少封面图", "请上传 JPG、PNG 或 WebP 封面图，或在前端勾选自动截取封面。Missing poster file.");
  }
  if (!ALLOWED_VIDEO_TYPES.has(video.type)) {
    return uploadError("视频格式不支持", `当前格式：${video.type || "unknown"}。请上传 MP4、WebM 或 OGG。`);
  }
  if (video.size > MAX_VIDEO_BYTES) {
    return uploadError("视频文件太大", `当前大小约 ${(video.size / 1024 / 1024).toFixed(1)}MB，最大支持 ${MAX_VIDEO_MB}MB。`);
  }
  if (!ALLOWED_IMAGE_TYPES.has(poster.type)) {
    return uploadError("封面图格式不支持", `当前格式：${poster.type || "unknown"}。请上传 JPG、PNG 或 WebP。`);
  }
  if (poster.size > MAX_POSTER_BYTES) {
    return uploadError("封面图太大", `当前大小约 ${(poster.size / 1024 / 1024).toFixed(1)}MB，最大支持 ${MAX_POSTER_MB}MB。`);
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
    discoverCategoryId,
  });

  return NextResponse.json({ video: uploaded });
}
