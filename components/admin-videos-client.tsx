"use client";

import { upload } from "@vercel/blob/client";
import Image from "next/image";
import Link from "next/link";
import { KeyRound, UploadCloud } from "lucide-react";
import { useState } from "react";

import { matchesDiscoverCategory } from "@/lib/discover-categories";
import { type ContentSettings, type DiscoverCategory, type FeaturedCase, type FeedVideoItem, type Locale } from "@/lib/types";

const TOKEN_STORAGE_KEY = "ns_admin_token";

type UploadStatus = "idle" | "submitting" | "done" | "error";
type TabKey = "upload" | "home" | "discover" | "cases";

type AdminSnapshot = {
  videos: FeedVideoItem[];
  contentSettings: ContentSettings;
  featuredCases: FeaturedCase[];
};

function orderedIds(items: Array<{ id: string }>, saved: string[]) {
  const ids = items.map((item) => item.id);
  const savedSet = new Set(saved);
  const uniqueSaved = saved.filter((id, index) => saved.indexOf(id) === index);
  return [...uniqueSaved.filter((id) => ids.includes(id)), ...ids.filter((id) => !savedSet.has(id))];
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

function moveToIndex<T>(items: T[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

function extensionFor(file: File, fallback: string) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : fallback;
}

function capturePosterFromVideo(file: File) {
  return new Promise<File>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    function cleanup() {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    }

    video.addEventListener("loadedmetadata", () => {
      video.currentTime = Math.min(1, Math.max(0, (video.duration || 1) / 3));
    }, { once: true });

    video.addEventListener("seeked", () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext("2d");
        if (!context || !canvas.width || !canvas.height) throw new Error("Poster capture failed");
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          cleanup();
          if (!blob) {
            reject(new Error("Poster capture failed"));
            return;
          }
          resolve(new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-poster.jpg`, { type: "image/jpeg" }));
        }, "image/jpeg", 0.88);
      } catch (error) {
        cleanup();
        reject(error);
      }
    }, { once: true });

    video.addEventListener("error", () => {
      cleanup();
      reject(new Error("Video preview failed"));
    }, { once: true });
  });
}

function getErrorDetail(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

async function readApiError(response: Response, fallback: string) {
  const data = (await response.json().catch(() => null)) as { error?: string; details?: string } | null;
  const detail = data?.details ? `${data.error ?? fallback}: ${data.details}` : data?.error;
  return detail ?? `${fallback} (HTTP ${response.status})`;
}

async function uploadBlobAsset(file: File, folder: "videos" | "posters", token: string, onProgress?: (percentage: number) => void) {
  const fallback = folder === "videos" ? "mp4" : "jpg";
  const pathname = `uploads/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 12)}.${extensionFor(file, fallback)}`;
  try {
    return await upload(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/admin/blob-upload",
      headers: { "x-admin-token": token },
      contentType: file.type,
      multipart: folder === "videos",
      onUploadProgress: (progress) => onProgress?.(Math.round(progress.percentage)),
    });
  } catch (error) {
    const detail = getErrorDetail(error, "Blob upload failed");
    throw new Error(`${folder === "videos" ? "Video" : "Poster"} upload failed: ${detail}`);
  }
}

function slugifyCategory(raw: string) {
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || `category-${Date.now()}`;
}

export function AdminVideosClient({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
  });
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<TabKey>("upload");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState("");
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [homeOrder, setHomeOrder] = useState<string[]>([]);
  const [homeHiddenIds, setHomeHiddenIds] = useState<string[]>([]);
  const [discoverOrder, setDiscoverOrder] = useState<string[]>([]);
  const [discoverHiddenIds, setDiscoverHiddenIds] = useState<string[]>([]);
  const [discoverCategories, setDiscoverCategories] = useState<DiscoverCategory[]>([]);
  const [caseOrder, setCaseOrder] = useState<string[]>([]);
  const [createdVideo, setCreatedVideo] = useState<FeedVideoItem | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  async function load(nextToken = token) {
    const res = await fetch("/api/admin/videos", {
      headers: { "x-admin-token": nextToken },
      cache: "no-store",
    });
    if (res.status === 401) throw new Error(zh ? "ADMIN_TOKEN 错误" : "Invalid ADMIN_TOKEN");
    if (!res.ok) throw new Error(zh ? "加载失败" : "Failed to load");
    const data = (await res.json()) as AdminSnapshot;
    setSnapshot(data);
    setHomeOrder(orderedIds(data.videos, data.contentSettings.homeVideoOrder));
    setHomeHiddenIds(data.contentSettings.homeVideoHiddenIds ?? []);
    setDiscoverOrder(orderedIds(data.videos, data.contentSettings.discoverVideoOrder));
    setDiscoverHiddenIds(data.contentSettings.discoverVideoHiddenIds ?? []);
    setDiscoverCategories(data.contentSettings.discoverCategories);
    setCaseOrder(orderedIds(data.featuredCases, data.contentSettings.featuredCaseOrder));
    return data;
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");

    try {
      await load(token);
      window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
      setAuthed(true);
      setStatus("idle");
    } catch (error) {
      setAuthed(false);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : zh ? "校验失败" : "Verification failed");
    }
  }

  async function saveSettings(next: Partial<ContentSettings>) {
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/admin/videos", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error(await readApiError(res, zh ? "保存失败" : "Save failed"));
      await load();
      setStatus("done");
      setMessage(zh ? "保存成功，排序已生效。" : "Saved successfully. The order is now live.");
    } catch (error) {
      setStatus("error");
      setMessage(zh ? `保存失败：${getErrorDetail(error, "未知错误")}` : `Save failed: ${getErrorDetail(error, "unknown error")}`);
    }
  }

  async function handleVideoSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const sourceMode = String(formData.get("sourceMode") ?? "file");
    const video = formData.get("video");
    const poster = formData.get("poster");
    const autoPoster = formData.get("autoPoster") === "on";
    const externalVideoUrl = String(formData.get("externalVideoUrl") ?? "").trim();
    const externalPosterUrl = String(formData.get("externalPosterUrl") ?? "").trim();

    if (sourceMode === "url") {
      if (!URL.canParse(externalVideoUrl) || !URL.canParse(externalPosterUrl)) {
        setStatus("error");
        setMessage(zh ? "请填写有效的视频外链和封面图外链" : "Enter valid video and poster URLs");
        return;
      }
    } else {
      if (!(video instanceof File) || video.size === 0) {
        setStatus("error");
        setMessage(zh ? "请上传视频文件" : "Upload a video file");
        return;
      }
      if (!autoPoster && (!(poster instanceof File) || poster.size === 0)) {
        setStatus("error");
        setMessage(zh ? "请上传封面图，或勾选自动截取封面" : "Upload a poster image, or enable automatic poster capture");
        return;
      }
    }

    setStatus("submitting");
    setMessage(sourceMode === "url" ? (zh ? "正在创建外链作品记录..." : "Creating external URL video record...") : (zh ? "正在上传视频到云端..." : "Uploading video to cloud storage..."));
    setUploadProgress(0);
    setCreatedVideo(null);

    try {
      const assetUrls = sourceMode === "url"
        ? { videoUrl: externalVideoUrl, posterUrl: externalPosterUrl }
        : await (async () => {
            const posterFile = autoPoster ? await capturePosterFromVideo(video as File) : poster as File;
            const videoBlob = await uploadBlobAsset(video as File, "videos", token, (percentage) => setUploadProgress(Math.min(percentage, 95)));
            setMessage(zh ? "正在上传封面..." : "Uploading poster...");
            const posterBlob = await uploadBlobAsset(posterFile, "posters", token);
            return { videoUrl: videoBlob.url, posterUrl: posterBlob.url };
          })();
      setMessage(zh ? "正在创建作品记录..." : "Creating video record...");

      const payload = {
        kind: "video-from-blob",
        titleZh: String(formData.get("titleZh") ?? ""),
        titleEn: String(formData.get("titleEn") ?? ""),
        summaryZh: String(formData.get("summaryZh") ?? ""),
        summaryEn: String(formData.get("summaryEn") ?? ""),
        collection: String(formData.get("collection") ?? ""),
        discoverCategoryId: String(formData.get("discoverCategoryId") ?? ""),
        tags: String(formData.get("tags") ?? ""),
        videoUrl: assetUrls.videoUrl,
        posterUrl: assetUrls.posterUrl,
      };

      const res = await fetch("/api/admin/videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { video?: FeedVideoItem; error?: string };
      if (!res.ok || !data.video) throw new Error(data.error ?? (zh ? "创建作品记录失败" : "Failed to create video record"));
      setCreatedVideo(data.video);
      await load();
      setStatus("done");
      setUploadProgress(100);
      setMessage(zh ? "上传成功，作品已加入首页 feed 和观看页。" : "Upload complete. The video is now in the feed and watch page.");
      form.reset();
    } catch (error) {
      setStatus("error");
      const detail = error instanceof Error ? error.message : zh ? "未知错误" : "unknown error";
      setMessage(zh ? `上传失败：${detail}。如果勾选了自动封面，请改为手动上传一张封面图再试。` : `Upload failed: ${detail}. If auto poster was enabled, try uploading a poster image manually.`);
    }
  }


  async function deleteCase(caseId: string) {
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch(`/api/admin/videos?caseId=${encodeURIComponent(caseId)}`, {
        method: "DELETE",
        headers: { "x-admin-token": token },
      });
      if (!res.ok) throw new Error(await readApiError(res, zh ? "删除失败" : "Delete failed"));
      setCaseOrder((current) => current.filter((id) => id !== caseId));
      await load();
      setStatus("done");
      setMessage(zh ? "成功案例已删除，重复展示已清理。" : "Featured case deleted. Duplicate display is cleaned up.");
    } catch (error) {
      setStatus("error");
      setMessage(zh ? `删除失败：${getErrorDetail(error, "未知错误")}` : `Delete failed: ${getErrorDetail(error, "unknown error")}`);
    }
  }

  async function handleCaseSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("kind", "featured-case");
    const screenshot = formData.get("screenshot");
    if (!(screenshot instanceof File) || screenshot.size === 0) {
      setStatus("error");
      setMessage(zh ? "请上传账号主页截图" : "Upload an account screenshot");
      return;
    }

    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/admin/videos", {
        method: "POST",
        headers: { "x-admin-token": token },
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as { featuredCase?: FeaturedCase; error?: string; details?: string };
      if (!res.ok || !data.featuredCase) {
        const detail = data.details ? `${data.error ?? (zh ? "成功案例上传失败" : "Featured case upload failed")}: ${data.details}` : data.error;
        throw new Error(detail ?? `${zh ? "成功案例上传失败" : "Featured case upload failed"} (HTTP ${res.status})`);
      }
      await load();
      setStatus("done");
      setMessage(zh ? "成功案例已上传，首页优秀案例模块已更新。" : "Featured case uploaded. The home showcase section is updated.");
      form.reset();
    } catch (error) {
      setStatus("error");
      setMessage(zh ? `成功案例上传失败：${getErrorDetail(error, "未知错误")}` : `Featured case upload failed: ${getErrorDetail(error, "unknown error")}`);
    }
  }

  if (!authed) {
    return (
      <form onSubmit={handleLogin} className="max-w-md rounded-[28px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.18)]">
        <label className="grid gap-2 text-sm">
          <span className="text-[var(--avp-text-muted)]">ADMIN_TOKEN</span>
          <input type="password" value={token} onChange={(event) => setToken(event.target.value)} className="rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text)] outline-none transition focus:border-[var(--avp-border-strong)]" autoFocus />
        </label>
        <button type="submit" disabled={status === "submitting"} className="mt-4 inline-flex min-h-[46px] items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffffff_0%,#e7f1ff_100%)] px-5 text-sm font-semibold text-[#0d3d7b] disabled:opacity-60">
          <KeyRound className="mr-2 h-4 w-4" />
          {status === "submitting" ? (zh ? "校验中..." : "Verifying...") : zh ? "进入内部后台" : "Enter internal admin"}
        </button>
        {message ? <p className="mt-3 text-sm text-[#ff748f]">{message}</p> : null}
      </form>
    );
  }

  const videos = snapshot?.videos ?? [];
  const cases = snapshot?.featuredCases ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(["upload", "home", "discover", "cases"] as const).map((key) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={tab === key ? "rounded-full bg-[linear-gradient(180deg,#ffffff_0%,#e7f1ff_100%)] px-4 py-2 text-xs font-semibold text-[#0d3d7b]" : "rounded-full border border-[var(--avp-border)] bg-[rgba(255,255,255,0.04)] px-4 py-2 text-xs text-[var(--avp-text-muted)]"}>
            {key === "upload" ? (zh ? "作品上传" : "Upload") : key === "home" ? (zh ? "首页排序" : "Home order") : key === "discover" ? (zh ? "Discover 管理" : "Discover management") : "Featured Cases"}
          </button>
        ))}
      </div>

      {message ? <p className={status === "error" ? "text-sm text-[#ff748f]" : "text-sm text-[#b2e2ff]"}>{message}</p> : null}

      {tab === "upload" ? <UploadVideoForm locale={locale} status={status} createdVideo={createdVideo} onSubmit={handleVideoSubmit} categories={discoverCategories} uploadProgress={uploadProgress} /> : null}
      {tab === "home" ? <OrderEditor locale={locale} videos={videos} order={homeOrder} setOrder={setHomeOrder} hiddenIds={homeHiddenIds} setHiddenIds={setHomeHiddenIds} onSave={() => saveSettings({ homeVideoOrder: homeOrder, homeVideoHiddenIds: homeHiddenIds })} /> : null}
      {tab === "discover" ? <DiscoverManager locale={locale} videos={videos} order={discoverOrder} setOrder={setDiscoverOrder} hiddenIds={discoverHiddenIds} setHiddenIds={setDiscoverHiddenIds} categories={discoverCategories} setCategories={setDiscoverCategories} onSave={() => saveSettings({ discoverVideoOrder: discoverOrder, discoverVideoHiddenIds: discoverHiddenIds, discoverCategories })} /> : null}
      {tab === "cases" ? <FeaturedCaseManager locale={locale} cases={cases} order={caseOrder} setOrder={setCaseOrder} onSubmit={handleCaseSubmit} onDelete={deleteCase} onSave={() => saveSettings({ featuredCaseOrder: caseOrder })} /> : null}
    </div>
  );
}

function UploadVideoForm({ locale, status, createdVideo, onSubmit, categories, uploadProgress }: { locale: Locale; status: UploadStatus; createdVideo: FeedVideoItem | null; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; categories: DiscoverCategory[]; uploadProgress: number }) {
  const zh = locale === "zh";
  const selectableCategories = categories.filter((category) => category.id !== "all");
  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={onSubmit} className="rounded-[28px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.18)]">
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput name="titleZh" label={zh ? "中文标题" : "Chinese title"} required />
            <TextInput name="titleEn" label={zh ? "英文标题" : "English title"} />
          </div>
          <TextArea name="summaryZh" label={zh ? "中文简介" : "Chinese summary"} required />
          <TextArea name="summaryEn" label={zh ? "英文简介" : "English summary"} />
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput name="collection" label={zh ? "短剧/合集名称" : "Drama or collection"} placeholder={zh ? "例如：总裁短剧第一季" : "e.g. CEO Drama Season 1"} required />
            <label className="grid gap-2 text-sm">
              <span className="text-[var(--avp-text-muted)]">{zh ? "Discover 分类" : "Discover category"}</span>
              <select name="discoverCategoryId" defaultValue="" required className="rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text)] outline-none transition focus:border-[var(--avp-border-strong)]">
                <option value="" disabled>{zh ? "选择 Discover 分类" : "Choose a Discover category"}</option>
                {selectableCategories.map((category) => (
                  <option key={category.id} value={category.id}>{category.title[locale]}</option>
                ))}
              </select>
            </label>
          </div>
          <TextInput name="tags" label={zh ? "标签" : "Tags"} placeholder={zh ? "短剧,爱情,逆袭" : "drama,romance,revenge"} />
          <div className="grid gap-3 rounded-[22px] border border-[var(--avp-border)] bg-[rgba(0,0,0,0.14)] p-4">
            <p className="text-sm font-semibold text-[var(--avp-text)]">{zh ? "素材来源" : "Asset source"}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text-muted)]">
                <input name="sourceMode" type="radio" value="file" defaultChecked className="h-4 w-4" />
                <span>{zh ? "上传文件到 Vercel Blob" : "Upload files to Vercel Blob"}</span>
              </label>
              <label className="flex items-center gap-3 rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text-muted)]">
                <input name="sourceMode" type="radio" value="url" className="h-4 w-4" />
                <span>{zh ? "使用外链（不占 Blob 空间）" : "Use external URLs (no Blob storage)"}</span>
              </label>
            </div>
          </div>
          <FileInput name="video" label={zh ? "视频文件（文件模式）" : "Video file (file mode)"} accept="video/mp4,video/webm,video/ogg,.mp4,.webm,.ogv" required={false} />
          <label className="flex items-center gap-3 rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text-muted)]">
            <input name="autoPoster" type="checkbox" className="h-4 w-4" />
            <span>{zh ? "自动截取视频中的一帧作为封面（文件模式）" : "Automatically capture a video frame as poster (file mode)"}</span>
          </label>
          <FileInput name="poster" label={zh ? "封面图（文件模式，不勾选自动封面时必填）" : "Poster image (file mode, required unless auto poster is enabled)"} accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" required={false} />
          <div className="grid gap-3 rounded-[22px] border border-[var(--avp-border)] bg-[rgba(0,0,0,0.14)] p-4">
            <p className="text-sm font-semibold text-[var(--avp-text)]">{zh ? "外链模式" : "External URL mode"}</p>
            <TextInput name="externalVideoUrl" label={zh ? "视频外链 URL" : "Video URL"} placeholder="https://.../episode.mp4" />
            <TextInput name="externalPosterUrl" label={zh ? "封面图外链 URL" : "Poster image URL"} placeholder="https://.../poster.jpg" />
            <p className="text-xs leading-5 text-[var(--avp-text-muted)]">{zh ? "外链必须可公开访问，视频建议 MP4/WebM，封面建议 JPG/PNG/WebP；这样不会占用 Vercel Blob 额度。" : "URLs must be publicly accessible. MP4/WebM is recommended for video, JPG/PNG/WebP for poster. This does not use Vercel Blob quota."}</p>
          </div>
          {status === "submitting" ? (
            <div className="rounded-[18px] border border-[var(--avp-border)] bg-[rgba(0,0,0,0.16)] p-3">
              <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]"><div className="h-full rounded-full bg-[#b2e2ff] transition-all" style={{ width: `${uploadProgress}%` }} /></div>
              <p className="mt-2 text-xs text-[var(--avp-text-muted)]">{zh ? `上传进度 ${uploadProgress}%` : `Upload progress ${uploadProgress}%`}</p>
            </div>
          ) : null}
          <PrimaryButton disabled={status === "submitting"}>{status === "submitting" ? (zh ? "上传中..." : "Uploading...") : zh ? "上传并发布" : "Upload and publish"}</PrimaryButton>
        </div>
      </form>
      <div className="rounded-[28px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-6">
        <h2 className="text-xl font-semibold text-[var(--avp-text)]">{zh ? "上传规则" : "Upload rules"}</h2>
        <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--avp-text-muted)]">
          <p>{zh ? "这个入口不会展示在用户前端，也不会加入导航。" : "This entry is hidden from the public frontend and navigation."}</p>
          <p>{zh ? "上传成功后，作品会进入云端数据源，可在首页和 Discover 管理里调整位置。视频最大支持 5GB，建议使用稳定网络上传大文件。" : "After upload, the video enters cloud storage and can be reordered for Home and Discover. Videos up to 5GB are supported; use a stable network for large files."}</p>
        </div>
        {createdVideo ? (
          <div className="mt-6 rounded-[22px] border border-[rgba(178,226,255,0.22)] bg-[rgba(79,153,255,0.08)] p-4 text-sm">
            <p className="font-semibold text-[var(--avp-text)]">{createdVideo.title[locale]}</p>
            <p className="mt-2 font-mono text-xs text-[var(--avp-text-muted)]">{createdVideo.id}</p>
            <Link href={`/watch/${createdVideo.id}?lang=${locale}`} className="mt-4 inline-flex min-h-[42px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#f7fbff_0%,#bfe2ff_45%,#8b7dff_100%)] px-4 text-xs font-bold text-[#061a36]">{zh ? "预览作品" : "Preview video"}</Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function OrderEditor({ locale, videos, order, setOrder, hiddenIds, setHiddenIds, onSave }: { locale: Locale; videos: FeedVideoItem[]; order: string[]; setOrder: (ids: string[]) => void; hiddenIds: string[]; setHiddenIds: (ids: string[]) => void; onSave: () => void }) {
  const zh = locale === "zh";
  const byId = new Map(videos.map((video) => [video.id, video]));
  const hiddenSet = new Set(hiddenIds);
  const visibleOrder = order.filter((id) => !hiddenSet.has(id));
  const ordered = visibleOrder.map((id) => byId.get(id)).filter((video): video is FeedVideoItem => Boolean(video));
  const hiddenVideos = hiddenIds.map((id) => byId.get(id)).filter((video): video is FeedVideoItem => Boolean(video));
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function removeVideo(videoId: string) {
    setOrder(order.filter((id) => id !== videoId));
    setHiddenIds(hiddenIds.includes(videoId) ? hiddenIds : [...hiddenIds, videoId]);
  }

  function addVideo(videoId: string) {
    setHiddenIds(hiddenIds.filter((id) => id !== videoId));
    setOrder(order.includes(videoId) ? order : [...order, videoId]);
  }

  function moveVisible(fromIndex: number, toIndex: number) {
    const nextVisibleOrder = moveToIndex(visibleOrder, fromIndex, toIndex);
    const nextVisibleSet = new Set(nextVisibleOrder);
    setOrder([...nextVisibleOrder, ...order.filter((id) => !nextVisibleSet.has(id) && !hiddenSet.has(id))]);
  }

  return (
    <div className="space-y-5 rounded-[28px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--avp-text)]">{zh ? "当前公开展示" : "Currently public"}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--avp-text-muted)]">{zh ? "可以拖动排序，也可以用上移、下移、移除；点击下方保存按钮后才会生效。" : "Drag to reorder, or use move/remove. Changes only take effect after save."}</p>
      </div>
      <div className="grid gap-3">
        {ordered.map((video, index) => (
          <div key={video.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragIndex !== null) moveVisible(dragIndex, index); setDragIndex(null); }} onDragEnd={() => setDragIndex(null)} className="grid cursor-grab grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-3 active:cursor-grabbing">
            <div className="relative h-16 overflow-hidden rounded-[12px]"><Image src={video.posterUrl} alt={video.title[locale]} fill sizes="56px" className="object-cover" /></div>
            <div className="min-w-0"><p className="truncate font-semibold text-[var(--avp-text)]">{index + 1}. {video.title[locale]}</p><p className="text-xs text-[var(--avp-text-muted)]">{video.id} · {video.collection}</p></div>
            <div className="flex flex-wrap justify-end gap-2"><SmallButton onClick={() => setOrder(moveItem(visibleOrder, index, -1))}>↑</SmallButton><SmallButton onClick={() => setOrder(moveItem(visibleOrder, index, 1))}>↓</SmallButton><SmallButton onClick={() => removeVideo(video.id)}>{zh ? "移除" : "Remove"}</SmallButton></div>
          </div>
        ))}
      </div>

      <div className="rounded-[22px] border border-[var(--avp-border)] bg-[rgba(0,0,0,0.16)] p-4">
        <h3 className="font-semibold text-[var(--avp-text)]">{zh ? "已移除，可添加回来" : "Removed, can be added back"}</h3>
        {hiddenVideos.length ? (
          <div className="mt-4 grid gap-3">
            {hiddenVideos.map((video) => (
              <div key={video.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-3">
                <div className="relative h-16 overflow-hidden rounded-[12px]"><Image src={video.posterUrl} alt={video.title[locale]} fill sizes="56px" className="object-cover" /></div>
                <div className="min-w-0"><p className="truncate font-semibold text-[var(--avp-text)]">{video.title[locale]}</p><p className="text-xs text-[var(--avp-text-muted)]">{video.id} · {video.collection}</p></div>
                <SmallButton onClick={() => addVideo(video.id)}>{zh ? "添加回来" : "Add back"}</SmallButton>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--avp-text-muted)]">{zh ? "目前没有被移除的视频。" : "No removed videos yet."}</p>
        )}
      </div>

      <PrimaryButton onClick={onSave}>{zh ? "确认并保存当前设置" : "Confirm and save current settings"}</PrimaryButton>
    </div>
  );
}

function DiscoverManager({ locale, videos, order, setOrder, hiddenIds, setHiddenIds, categories, setCategories, onSave }: { locale: Locale; videos: FeedVideoItem[]; order: string[]; setOrder: (ids: string[]) => void; hiddenIds: string[]; setHiddenIds: (ids: string[]) => void; categories: DiscoverCategory[]; setCategories: (items: DiscoverCategory[]) => void; onSave: () => void }) {
  const zh = locale === "zh";
  const byId = new Map(videos.map((video) => [video.id, video]));
  const hiddenSet = new Set(hiddenIds);
  const visibleOrder = order.filter((id) => !hiddenSet.has(id));
  const orderedVideos = visibleOrder.map((id) => byId.get(id)).filter((video): video is FeedVideoItem => Boolean(video));
  const hiddenVideos = hiddenIds.map((id) => byId.get(id)).filter((video): video is FeedVideoItem => Boolean(video));
  const [categoryDragIndex, setCategoryDragIndex] = useState<number | null>(null);
  const [videoDrag, setVideoDrag] = useState<{ categoryId: string; index: number } | null>(null);

  function updateCategory(index: number, next: Partial<DiscoverCategory>) {
    setCategories(categories.map((category, itemIndex) => (itemIndex === index ? { ...category, ...next } : category)));
  }

  function addCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const titleZh = String(formData.get("titleZh") ?? "").trim();
    const titleEn = String(formData.get("titleEn") ?? "").trim();
    const match = String(formData.get("match") ?? "").trim();
    if (!titleZh) return;
    const baseId = slugifyCategory(titleEn || titleZh);
    const existing = new Set(categories.map((category) => category.id));
    let id = baseId;
    let count = 2;
    while (existing.has(id)) {
      id = `${baseId}-${count}`;
      count += 1;
    }
    setCategories([...categories, { id, title: { zh: titleZh, en: titleEn || titleZh }, match }]);
    form.reset();
  }

  function videosForCategory(category: DiscoverCategory) {
    if (category.id === "all") return orderedVideos;
    const allOrdered = order.map((id) => byId.get(id)).filter((video): video is FeedVideoItem => Boolean(video));
    return allOrdered.filter((video, index) => !hiddenSet.has(video.id) && matchesDiscoverCategory(video, category, index));
  }

  function moveCategoryVideo(category: DiscoverCategory, fromIndex: number, toIndex: number) {
    const categoryVideos = videosForCategory(category);
    const movedCategoryIds = moveToIndex(categoryVideos.map((video) => video.id), fromIndex, toIndex);
    const movedSet = new Set(movedCategoryIds);
    if (category.id === "all") {
      setOrder([...movedCategoryIds, ...order.filter((id) => !movedSet.has(id) && !hiddenSet.has(id))]);
      return;
    }
    const nextOrder = [...order];
    let cursor = 0;
    for (let index = 0; index < nextOrder.length; index += 1) {
      if (movedSet.has(nextOrder[index])) {
        nextOrder[index] = movedCategoryIds[cursor];
        cursor += 1;
      }
    }
    setOrder(nextOrder);
  }

  function removeVideo(videoId: string) {
    setOrder(order.filter((id) => id !== videoId));
    setHiddenIds(hiddenIds.includes(videoId) ? hiddenIds : [...hiddenIds, videoId]);
  }

  function addVideo(videoId: string) {
    setHiddenIds(hiddenIds.filter((id) => id !== videoId));
    setOrder(order.includes(videoId) ? order : [...order, videoId]);
  }

  return (
    <div className="space-y-6 rounded-[28px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--avp-text)]">{zh ? "Discover 管理" : "Discover management"}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--avp-text-muted)]">{zh ? "分类和对应视频在同一页管理。可以拖动排序，也可以用上移/下移；所有修改点击底部保存后才会生效。" : "Manage categories and their videos together. Drag to reorder or use move buttons, then save once at the bottom."}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={addCategory} className="rounded-[22px] border border-[var(--avp-border)] bg-[rgba(0,0,0,0.14)] p-4">
          <div className="grid gap-4">
            <h3 className="font-semibold text-[var(--avp-text)]">{zh ? "添加分类" : "Add category"}</h3>
            <div className="grid gap-3 sm:grid-cols-2"><TextInput name="titleZh" label={zh ? "中文分类名" : "Chinese category"} required /><TextInput name="titleEn" label={zh ? "英文分类名" : "English category"} /></div>
            <TextInput name="match" label={zh ? "匹配关键词" : "Match keywords"} placeholder={zh ? "例如：甜宠,霸总,drama" : "e.g. romance,ceo,drama"} />
            <PrimaryButton>{zh ? "添加分类" : "Add category"}</PrimaryButton>
          </div>
        </form>

        <div className="space-y-3 rounded-[22px] border border-[var(--avp-border)] bg-[rgba(0,0,0,0.14)] p-4">
          <h3 className="font-semibold text-[var(--avp-text)]">{zh ? "分类排序" : "Category order"}</h3>
          {categories.map((category, index) => (
            <div key={category.id} draggable onDragStart={() => setCategoryDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (categoryDragIndex !== null) setCategories(moveToIndex(categories, categoryDragIndex, index)); setCategoryDragIndex(null); }} onDragEnd={() => setCategoryDragIndex(null)} className="grid cursor-grab gap-3 rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-3 active:cursor-grabbing">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--avp-text)]">{index + 1}. {category.title[locale]}</p>
                  <p className="font-mono text-xs text-[var(--avp-text-muted)]">{category.id}{category.locked ? ` · ${zh ? "固定分类" : "locked"}` : ""}</p>
                </div>
                <div className="flex gap-2"><SmallButton onClick={() => setCategories(moveItem(categories, index, -1))}>↑</SmallButton><SmallButton onClick={() => setCategories(moveItem(categories, index, 1))}>↓</SmallButton>{category.locked ? null : <SmallButton onClick={() => setCategories(categories.filter((item) => item.id !== category.id))}>{zh ? "删除" : "Delete"}</SmallButton>}</div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-2 text-sm"><span className="text-[var(--avp-text-muted)]">{zh ? "中文名" : "Chinese"}</span><input value={category.title.zh} onChange={(event) => updateCategory(index, { title: { ...category.title, zh: event.target.value } })} disabled={category.locked} className="rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text)] outline-none transition disabled:opacity-60 focus:border-[var(--avp-border-strong)]" /></label>
                <label className="grid gap-2 text-sm"><span className="text-[var(--avp-text-muted)]">{zh ? "英文名" : "English"}</span><input value={category.title.en} onChange={(event) => updateCategory(index, { title: { ...category.title, en: event.target.value } })} disabled={category.locked} className="rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text)] outline-none transition disabled:opacity-60 focus:border-[var(--avp-border-strong)]" /></label>
              </div>
              <label className="grid gap-2 text-sm"><span className="text-[var(--avp-text-muted)]">{zh ? "匹配关键词" : "Match keywords"}</span><input value={category.match ?? ""} onChange={(event) => updateCategory(index, { match: event.target.value })} disabled={category.locked} className="rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text)] outline-none transition disabled:opacity-60 focus:border-[var(--avp-border-strong)]" /></label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((category) => {
          const categoryVideos = videosForCategory(category);
          return (
            <div key={category.id} className="rounded-[22px] border border-[var(--avp-border)] bg-[rgba(0,0,0,0.14)] p-4">
              <h3 className="font-semibold text-[var(--avp-text)]">{category.title[locale]} · {zh ? "视频排序" : "Video order"}</h3>
              {categoryVideos.length ? (
                <div className="mt-4 grid gap-3">
                  {categoryVideos.map((video, index) => (
                    <div key={`${category.id}-${video.id}`} draggable onDragStart={() => setVideoDrag({ categoryId: category.id, index })} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (videoDrag?.categoryId === category.id) moveCategoryVideo(category, videoDrag.index, index); setVideoDrag(null); }} onDragEnd={() => setVideoDrag(null)} className="grid cursor-grab grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-3 active:cursor-grabbing">
                      <div className="relative h-16 overflow-hidden rounded-[12px]"><Image src={video.posterUrl} alt={video.title[locale]} fill sizes="56px" className="object-cover" /></div>
                      <div className="min-w-0"><p className="truncate font-semibold text-[var(--avp-text)]">{index + 1}. {video.title[locale]}</p><p className="text-xs text-[var(--avp-text-muted)]">{video.id} · {video.collection}</p></div>
                      <div className="flex flex-wrap justify-end gap-2"><SmallButton onClick={() => moveCategoryVideo(category, index, Math.max(0, index - 1))}>↑</SmallButton><SmallButton onClick={() => moveCategoryVideo(category, index, Math.min(categoryVideos.length - 1, index + 1))}>↓</SmallButton><SmallButton onClick={() => removeVideo(video.id)}>{zh ? "移除" : "Remove"}</SmallButton></div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--avp-text-muted)]">{zh ? "这个分类下暂无公开视频。" : "No public videos in this category."}</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-[22px] border border-[var(--avp-border)] bg-[rgba(0,0,0,0.16)] p-4">
        <h3 className="font-semibold text-[var(--avp-text)]">{zh ? "已从 Discover 移除，可添加回来" : "Removed from Discover, can be added back"}</h3>
        {hiddenVideos.length ? (
          <div className="mt-4 grid gap-3">
            {hiddenVideos.map((video) => (
              <div key={video.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-3">
                <div className="relative h-16 overflow-hidden rounded-[12px]"><Image src={video.posterUrl} alt={video.title[locale]} fill sizes="56px" className="object-cover" /></div>
                <div className="min-w-0"><p className="truncate font-semibold text-[var(--avp-text)]">{video.title[locale]}</p><p className="text-xs text-[var(--avp-text-muted)]">{video.id} · {video.collection}</p></div>
                <SmallButton onClick={() => addVideo(video.id)}>{zh ? "添加回来" : "Add back"}</SmallButton>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--avp-text-muted)]">{zh ? "目前没有被移除的视频。" : "No removed videos yet."}</p>
        )}
      </div>

      <PrimaryButton onClick={onSave}>{zh ? "确认并保存 Discover 设置" : "Confirm and save Discover settings"}</PrimaryButton>
    </div>
  );
}

function FeaturedCaseManager({ locale, cases, order, setOrder, onSubmit, onDelete, onSave }: { locale: Locale; cases: FeaturedCase[]; order: string[]; setOrder: (ids: string[]) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onDelete: (caseId: string) => void; onSave: () => void }) {
  const zh = locale === "zh";
  const byId = new Map(cases.map((item) => [item.id, item]));
  const ordered = order.filter((id, index) => order.indexOf(id) === index).map((id) => byId.get(id)).filter((item): item is FeaturedCase => Boolean(item));
  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={onSubmit} className="rounded-[28px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-6">
        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2"><TextInput name="titleZh" label={zh ? "中文案例标题" : "Chinese title"} required /><TextInput name="titleEn" label={zh ? "英文案例标题" : "English title"} /></div>
          <TextArea name="summaryZh" label={zh ? "中文案例简介" : "Chinese summary"} required />
          <TextArea name="summaryEn" label={zh ? "英文案例简介" : "English summary"} />
          <TextInput name="accountName" label={zh ? "账号名称" : "Account name"} required />
          <div className="grid gap-3 sm:grid-cols-2"><TextInput name="followers" label={zh ? "现有粉丝数" : "Followers"} required /><TextInput name="totalViews" label={zh ? "视频总曝光量" : "Total views"} required /></div>
          <TextInput name="accountUrl" label={zh ? "账号跳转链接" : "Account URL"} required />
          <FileInput name="screenshot" label={zh ? "账号主页截图" : "Account screenshot"} accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" />
          <PrimaryButton>{zh ? "上传成功案例" : "Upload featured case"}</PrimaryButton>
        </div>
      </form>
      <div className="space-y-4 rounded-[28px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-6">
        {ordered.map((item, index) => (
          <div key={item.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-3">
            <div className="relative h-16 overflow-hidden rounded-[12px]"><Image src={item.screenshotUrl} alt={item.accountName} fill sizes="56px" className="object-cover" /></div>
            <div className="min-w-0"><p className="truncate font-semibold text-[var(--avp-text)]">{index + 1}. {item.accountName}</p><p className="text-xs text-[var(--avp-text-muted)]">{item.followers} · {item.totalViews}</p></div>
            <div className="flex gap-2"><SmallButton onClick={() => setOrder(moveItem(order, index, -1))}>↑</SmallButton><SmallButton onClick={() => setOrder(moveItem(order, index, 1))}>↓</SmallButton><SmallButton onClick={() => onDelete(item.id)}>{zh ? "删除" : "Delete"}</SmallButton></div>
          </div>
        ))}
        <PrimaryButton onClick={onSave}>{zh ? "确认并保存案例排序" : "Confirm and save case order"}</PrimaryButton>
      </div>
    </div>
  );
}

function TextInput({ name, label, placeholder, required }: { name: string; label: string; placeholder?: string; required?: boolean }) {
  return <label className="grid gap-2 text-sm"><span className="text-[var(--avp-text-muted)]">{label}</span><input name={name} required={required} placeholder={placeholder} className="rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text)] outline-none transition placeholder:text-[var(--avp-text-muted)] focus:border-[var(--avp-border-strong)]" /></label>;
}

function TextArea({ name, label, required }: { name: string; label: string; required?: boolean }) {
  return <label className="grid gap-2 text-sm"><span className="text-[var(--avp-text-muted)]">{label}</span><textarea name={name} rows={3} required={required} className="rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text)] outline-none transition focus:border-[var(--avp-border-strong)]" /></label>;
}

function FileInput({ name, label, accept, required = true }: { name: string; label: string; accept: string; required?: boolean }) {
  return <label className="grid gap-2 text-sm"><span className="text-[var(--avp-text-muted)]">{label}</span><input name={name} type="file" accept={accept} required={required} className="rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text)] file:mr-3 file:rounded-full file:border-0 file:bg-[rgba(178,226,255,0.14)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--avp-text)]" /></label>;
}

function PrimaryButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) {
  return <button type={onClick ? "button" : "submit"} disabled={disabled} onClick={onClick} className="group relative inline-flex min-h-[52px] items-center justify-center overflow-hidden rounded-full border border-[rgba(178,226,255,0.42)] bg-[linear-gradient(135deg,#f7fbff_0%,#bfe2ff_45%,#8b7dff_100%)] px-5 text-sm font-bold text-[#061a36] shadow-[0_14px_46px_rgba(79,153,255,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"><UploadCloud className="relative mr-2 h-4 w-4" /><span className="relative">{children}</span></button>;
}

function SmallButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-full border border-[var(--avp-border)] px-3 py-1 text-xs text-[var(--avp-text-muted)] transition hover:text-[var(--avp-text)]">{children}</button>;
}
