"use client";

import Image from "next/image";
import Link from "next/link";
import { KeyRound, UploadCloud } from "lucide-react";
import { useState } from "react";

import { type ContentSettings, type DiscoverCategory, type FeaturedCase, type FeedVideoItem, type Locale } from "@/lib/types";

const TOKEN_STORAGE_KEY = "ns_admin_token";

type UploadStatus = "idle" | "submitting" | "done" | "error";
type TabKey = "upload" | "home" | "discover" | "discover-categories" | "cases";

type AdminSnapshot = {
  videos: FeedVideoItem[];
  contentSettings: ContentSettings;
  featuredCases: FeaturedCase[];
};

function orderedIds(items: Array<{ id: string }>, saved: string[]) {
  const ids = items.map((item) => item.id);
  const savedSet = new Set(saved);
  return [...saved.filter((id) => ids.includes(id)), ...ids.filter((id) => !savedSet.has(id))];
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
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
      if (!res.ok) throw new Error("save failed");
      await load();
      setStatus("done");
      setMessage(zh ? "排序已确认保存。" : "Order confirmed and saved.");
    } catch {
      setStatus("error");
      setMessage(zh ? "保存失败" : "Save failed");
    }
  }

  async function handleVideoSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const video = formData.get("video");
    const poster = formData.get("poster");

    if (!(video instanceof File) || video.size === 0 || !(poster instanceof File) || poster.size === 0) {
      setStatus("error");
      setMessage(zh ? "请上传视频文件和封面图" : "Upload both a video file and poster image");
      return;
    }

    setStatus("submitting");
    setMessage("");
    setCreatedVideo(null);

    try {
      const res = await fetch("/api/admin/videos", {
        method: "POST",
        headers: { "x-admin-token": token },
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as { video?: FeedVideoItem; error?: string };
      if (!res.ok || !data.video) throw new Error(data.error ?? "upload failed");
      setCreatedVideo(data.video);
      await load();
      setStatus("done");
      setMessage(zh ? "上传成功，作品已加入首页 feed 和观看页。" : "Upload complete. The video is now in the feed and watch page.");
      form.reset();
    } catch (error) {
      setStatus("error");
      setMessage(zh ? `上传失败：${error instanceof Error ? error.message : "未知错误"}` : `Upload failed: ${error instanceof Error ? error.message : "unknown error"}`);
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
      if (!res.ok) throw new Error("upload failed");
      await load();
      setStatus("done");
      setMessage(zh ? "成功案例已上传。" : "Featured case uploaded.");
      form.reset();
    } catch {
      setStatus("error");
      setMessage(zh ? "成功案例上传失败" : "Featured case upload failed");
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
        {(["upload", "home", "discover", "discover-categories", "cases"] as const).map((key) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={tab === key ? "rounded-full bg-[linear-gradient(180deg,#ffffff_0%,#e7f1ff_100%)] px-4 py-2 text-xs font-semibold text-[#0d3d7b]" : "rounded-full border border-[var(--avp-border)] bg-[rgba(255,255,255,0.04)] px-4 py-2 text-xs text-[var(--avp-text-muted)]"}>
            {key === "upload" ? (zh ? "作品上传" : "Upload") : key === "home" ? (zh ? "首页排序" : "Home order") : key === "discover" ? (zh ? "Discover 视频排序" : "Discover videos") : key === "discover-categories" ? (zh ? "Discover 分类" : "Discover categories") : "Featured Cases"}
          </button>
        ))}
      </div>

      {message ? <p className={status === "error" ? "text-sm text-[#ff748f]" : "text-sm text-[#b2e2ff]"}>{message}</p> : null}

      {tab === "upload" ? <UploadVideoForm locale={locale} status={status} createdVideo={createdVideo} onSubmit={handleVideoSubmit} categories={discoverCategories} /> : null}
      {tab === "home" ? <OrderEditor locale={locale} videos={videos} order={homeOrder} setOrder={setHomeOrder} hiddenIds={homeHiddenIds} setHiddenIds={setHomeHiddenIds} onSave={() => saveSettings({ homeVideoOrder: homeOrder, homeVideoHiddenIds: homeHiddenIds })} /> : null}
      {tab === "discover" ? <OrderEditor locale={locale} videos={videos} order={discoverOrder} setOrder={setDiscoverOrder} hiddenIds={discoverHiddenIds} setHiddenIds={setDiscoverHiddenIds} onSave={() => saveSettings({ discoverVideoOrder: discoverOrder, discoverVideoHiddenIds: discoverHiddenIds })} /> : null}
      {tab === "discover-categories" ? <DiscoverCategoryManager locale={locale} categories={discoverCategories} setCategories={setDiscoverCategories} onSave={() => saveSettings({ discoverCategories })} /> : null}
      {tab === "cases" ? <FeaturedCaseManager locale={locale} cases={cases} order={caseOrder} setOrder={setCaseOrder} onSubmit={handleCaseSubmit} onSave={() => saveSettings({ featuredCaseOrder: caseOrder })} /> : null}
    </div>
  );
}

function UploadVideoForm({ locale, status, createdVideo, onSubmit, categories }: { locale: Locale; status: UploadStatus; createdVideo: FeedVideoItem | null; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; categories: DiscoverCategory[] }) {
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
          <FileInput name="video" label={zh ? "视频文件" : "Video file"} accept="video/mp4,video/webm,video/ogg,.mp4,.webm,.ogv" />
          <FileInput name="poster" label={zh ? "封面图" : "Poster image"} accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" />
          <PrimaryButton disabled={status === "submitting"}>{status === "submitting" ? (zh ? "上传中..." : "Uploading...") : zh ? "上传并发布" : "Upload and publish"}</PrimaryButton>
        </div>
      </form>
      <div className="rounded-[28px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-6">
        <h2 className="text-xl font-semibold text-[var(--avp-text)]">{zh ? "上传规则" : "Upload rules"}</h2>
        <div className="mt-4 space-y-3 text-sm leading-7 text-[var(--avp-text-muted)]">
          <p>{zh ? "这个入口不会展示在用户前端，也不会加入导航。" : "This entry is hidden from the public frontend and navigation."}</p>
          <p>{zh ? "上传成功后，作品会进入本地数据源，可在首页和 Discover 排序里调整位置。" : "After upload, the video enters local storage and can be reordered for Home and Discover."}</p>
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

  function removeVideo(videoId: string) {
    setOrder(order.filter((id) => id !== videoId));
    setHiddenIds(hiddenIds.includes(videoId) ? hiddenIds : [...hiddenIds, videoId]);
  }

  function addVideo(videoId: string) {
    setHiddenIds(hiddenIds.filter((id) => id !== videoId));
    setOrder(order.includes(videoId) ? order : [...order, videoId]);
  }

  return (
    <div className="space-y-5 rounded-[28px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-6">
      <div>
        <h2 className="text-xl font-semibold text-[var(--avp-text)]">{zh ? "当前公开展示" : "Currently public"}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--avp-text-muted)]">{zh ? "上移、下移、移除都只是暂存操作，点击下方保存按钮后才会生效。" : "Move and remove changes are staged first. They only take effect after you click save."}</p>
      </div>
      <div className="grid gap-3">
        {ordered.map((video, index) => (
          <div key={video.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-3">
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

function DiscoverCategoryManager({ locale, categories, setCategories, onSave }: { locale: Locale; categories: DiscoverCategory[]; setCategories: (items: DiscoverCategory[]) => void; onSave: () => void }) {
  const zh = locale === "zh";

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

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={addCategory} className="rounded-[28px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-6">
        <div className="grid gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--avp-text)]">{zh ? "添加 Discover 分类" : "Add Discover category"}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--avp-text-muted)]">{zh ? "分类会显示在 Discover 顶部筛选栏，并按右侧顺序展示分类板块。匹配关键词可填中文、英文或合集名，用逗号分隔。" : "Categories appear in the Discover filter bar and sections. Match keywords can include Chinese, English, or collection names separated by commas."}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2"><TextInput name="titleZh" label={zh ? "中文分类名" : "Chinese category"} required /><TextInput name="titleEn" label={zh ? "英文分类名" : "English category"} /></div>
          <TextInput name="match" label={zh ? "匹配关键词" : "Match keywords"} placeholder={zh ? "例如：甜宠,霸总,drama" : "e.g. romance,ceo,drama"} />
          <PrimaryButton>{zh ? "添加分类" : "Add category"}</PrimaryButton>
        </div>
      </form>
      <div className="space-y-4 rounded-[28px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-6">
        {categories.map((category, index) => (
          <div key={category.id} className="grid gap-3 rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-3">
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
        <PrimaryButton onClick={onSave}>{zh ? "确认并保存分类" : "Confirm and save categories"}</PrimaryButton>
      </div>
    </div>
  );
}

function FeaturedCaseManager({ locale, cases, order, setOrder, onSubmit, onSave }: { locale: Locale; cases: FeaturedCase[]; order: string[]; setOrder: (ids: string[]) => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onSave: () => void }) {
  const zh = locale === "zh";
  const byId = new Map(cases.map((item) => [item.id, item]));
  const ordered = order.map((id) => byId.get(id)).filter((item): item is FeaturedCase => Boolean(item));
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
            <div className="flex gap-2"><SmallButton onClick={() => setOrder(moveItem(order, index, -1))}>↑</SmallButton><SmallButton onClick={() => setOrder(moveItem(order, index, 1))}>↓</SmallButton></div>
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

function FileInput({ name, label, accept }: { name: string; label: string; accept: string }) {
  return <label className="grid gap-2 text-sm"><span className="text-[var(--avp-text-muted)]">{label}</span><input name={name} type="file" accept={accept} required className="rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text)] file:mr-3 file:rounded-full file:border-0 file:bg-[rgba(178,226,255,0.14)] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[var(--avp-text)]" /></label>;
}

function PrimaryButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void }) {
  return <button type={onClick ? "button" : "submit"} disabled={disabled} onClick={onClick} className="group relative inline-flex min-h-[52px] items-center justify-center overflow-hidden rounded-full border border-[rgba(178,226,255,0.42)] bg-[linear-gradient(135deg,#f7fbff_0%,#bfe2ff_45%,#8b7dff_100%)] px-5 text-sm font-bold text-[#061a36] shadow-[0_14px_46px_rgba(79,153,255,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"><UploadCloud className="relative mr-2 h-4 w-4" /><span className="relative">{children}</span></button>;
}

function SmallButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-full border border-[var(--avp-border)] px-3 py-1 text-xs text-[var(--avp-text-muted)] transition hover:text-[var(--avp-text)]">{children}</button>;
}
