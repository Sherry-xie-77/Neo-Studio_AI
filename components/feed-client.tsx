"use client";

import { Heart, MessageCircle } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { captureClientEvent } from "@/lib/client/posthog";
import { CreepyActionButton } from "@/components/creepy-action-button";
import { JellyButton } from "@/components/jelly-button";
import { TRACKING_EVENTS } from "@/lib/constants";
import { type FeedVideoItem, type Locale, type VideoComment } from "@/lib/types";
import { cn } from "@/lib/utils";

type FeedClientProps = {
  locale: Locale;
  initialVideos: FeedVideoItem[];
  initialComments: Record<string, VideoComment[]>;
  initialFilters: {
    tag?: string;
    intent?: string;
    sort?: string;
  };
};

type CommentState = {
  nickname: string;
  body: string;
};

function getSessionId() {
  if (typeof window === "undefined") return "server";

  const key = "neo-session-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next = `sess_${crypto.randomUUID()}`;
  window.localStorage.setItem(key, next);
  return next;
}

export function FeedClient({
  locale,
  initialVideos,
  initialComments,
  initialFilters,
}: FeedClientProps) {
  void initialFilters;
  const [sessionId] = useState(() =>
    typeof window === "undefined" ? "session_pending" : getSessionId(),
  );
  const [videos, setVideos] = useState(initialVideos);
  const [commentsByVideo, setCommentsByVideo] =
    useState<Record<string, VideoComment[]>>(initialComments);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [commentTarget, setCommentTarget] = useState<FeedVideoItem | null>(null);
  const [commentState, setCommentState] = useState<CommentState>({
    nickname: "",
    body: "",
  });
  const [isCommentBusy, setIsCommentBusy] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState(initialVideos[0]?.id ?? "");
  const [showWatchCursor, setShowWatchCursor] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [cursorScale, setCursorScale] = useState(1);
  const [scrollY, setScrollY] = useState(0);
  const lastTriggerButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    captureClientEvent(TRACKING_EVENTS.feedView, {
      locale,
      sessionId,
      videoCount: initialVideos.length,
    });
  }, [initialVideos.length, locale, sessionId]);

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-feed-card]"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    if (!mobile || reduceMotion) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target.querySelector("video");
          if (!(video instanceof HTMLVideoElement)) continue;

          if (entry.isIntersecting) {
            void video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.7 },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [videos]);

  useEffect(() => {
    const media = window.matchMedia("(pointer: fine)");
    const update = () => setShowWatchCursor(media.matches);

    update();
    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const commentList = useMemo(
    () => (commentTarget ? commentsByVideo[commentTarget.id] ?? [] : []),
    [commentTarget, commentsByVideo],
  );
  const activeVideo =
    videos.find((video) => video.id === activeVideoId) ?? videos[0] ?? null;
  const leftColumnVideos = useMemo(
    () => videos.filter((_, index) => index % 2 === 0),
    [videos],
  );
  const rightColumnVideos = useMemo(
    () => videos.filter((_, index) => index % 2 === 1),
    [videos],
  );

  async function handleLike(videoId: string) {
    const response = await fetch(`/api/videos/${videoId}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sessionId }),
    });

    if (!response.ok) return;
    const payload = (await response.json()) as {
      liked: boolean;
      likesCount: number;
    };

    setLikedIds((current) => ({
      ...current,
      [videoId]: payload.liked,
    }));
    setVideos((current) =>
      current.map((video) =>
        video.id === videoId ? { ...video, likesCount: payload.likesCount } : video,
      ),
    );
    captureClientEvent(TRACKING_EVENTS.videoLike, {
      sessionId,
      videoId,
      liked: payload.liked,
    });
  }

  async function openComments(video: FeedVideoItem, trigger?: HTMLButtonElement | null) {
    const response = await fetch(`/api/videos/${video.id}/comments`);
    if (response.ok) {
      const payload = (await response.json()) as {
        comments: VideoComment[];
      };
      setCommentsByVideo((current) => ({
        ...current,
        [video.id]: payload.comments,
      }));
    }
    lastTriggerButtonRef.current = trigger ?? null;
    setCommentTarget(video);
    captureClientEvent(TRACKING_EVENTS.commentPanelOpen, {
      sessionId,
      videoId: video.id,
    });
  }

  function closeComments() {
    setCommentTarget(null);
    window.setTimeout(() => {
      lastTriggerButtonRef.current?.focus();
    }, 30);
  }

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!commentTarget) return;

    setIsCommentBusy(true);
    const response = await fetch(`/api/videos/${commentTarget.id}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId,
        nickname: commentState.nickname,
        body: commentState.body,
      }),
    });

    await new Promise((resolve) => window.setTimeout(resolve, 220));
    setIsCommentBusy(false);

    if (!response.ok) return;

    const payload = (await response.json()) as {
      comments: VideoComment[];
      commentsCount: number;
    };

    setCommentsByVideo((current) => ({
      ...current,
      [commentTarget.id]: payload.comments,
    }));
    setVideos((current) =>
      current.map((video) =>
        video.id === commentTarget.id
          ? { ...video, commentsCount: payload.commentsCount }
          : video,
      ),
    );
    setCommentState((current) => ({ ...current, body: "" }));
    captureClientEvent(TRACKING_EVENTS.commentSubmit, {
      sessionId,
      videoId: commentTarget.id,
    });
  }

  return (
    <>
      {showWatchCursor ? (
        <div
          className="pointer-events-none fixed z-[70] hidden h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-white/75 text-sm font-semibold uppercase tracking-[0.18em] text-[#001a42] mix-blend-screen transition duration-150 md:flex"
          style={{
            left: `${cursorPosition.x}px`,
            top: `${cursorPosition.y}px`,
            opacity: activeVideo ? 1 : 0,
            transform: `translate(-50%, -50%) scale(${cursorScale})`,
          }}
        >
          WATCH
        </div>
      ) : null}

      <section className="mb-10 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_220px] lg:items-start">
        <div className="space-y-3 pt-2">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--avp-text-muted)]">
            {locale === "zh" ? "爆款视频入口" : "VIRAL VIDEO ENTRY"}
          </p>
          <p className="text-sm leading-7 text-[var(--avp-text-muted)]">
            {locale === "zh"
              ? "想做爆款短视频、接广告、拿流量变现，就从这里找方向、拆模板、快速开做。"
              : "If you want viral short-form videos that drive traffic, ads, and monetization, start here to study the pattern and build faster."}
          </p>
        </div>

        <div className="space-y-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--avp-text-muted)]">
            {locale === "zh" ? "爆款案例观察" : "VIRAL CASE WATCH"}
          </p>
          <h1 className="text-4xl font-semibold uppercase leading-none text-[var(--avp-text)] sm:text-5xl lg:text-6xl">
            {activeVideo?.title[locale] ?? (locale === "zh" ? "精选视频" : "Featured video")}
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-7 text-[var(--avp-text-muted)]">
            {locale === "zh"
              ? "先看什么内容能火，再一键复刻、自由创作，把流量做成结果。"
              : "Study what can win attention first, then remake it or create from scratch and turn views into outcomes."}
          </p>
        </div>

        <div className="space-y-3 pt-2 text-right">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--avp-text-muted)]">
            {locale === "zh" ? "赚钱型工作流" : "MONETIZATION FLOW"}
          </p>
          <p className="text-sm leading-7 text-[var(--avp-text-muted)]">
            {locale === "zh"
              ? "从找灵感、看爆款、拆镜头，到生成成片，这里就是把内容做成收入的整条链路。"
              : "From inspiration and viral references to final generation, this is the full pipeline for turning content into revenue."}
          </p>
        </div>
      </section>

      <section
        className={cn(
          "mb-12 grid grid-cols-1 gap-5 pb-16 md:grid-cols-[0.96fr_1.04fr] md:gap-4 md:pb-20",
          showWatchCursor ? "cursor-none" : "",
        )}
        onMouseMove={(event) => {
          if (!showWatchCursor) return;
          setCursorPosition({ x: event.clientX, y: event.clientY });
        }}
        onMouseEnter={() => setCursorScale(1)}
        onMouseLeave={() => {
          setCursorScale(1);
        }}
      >
        <div
          className="space-y-10 md:pt-12 transition-transform duration-300"
          style={{ transform: `translateY(${scrollY * 0.016}px)` }}
        >
          {leftColumnVideos.map((video) => (
            <FeedVideoCard
              key={video.id}
              index={0}
              locale={locale}
              video={video}
              liked={Boolean(likedIds[video.id])}
              onLike={() => void handleLike(video.id)}
              onOpenComments={() => void openComments(video)}
              onActivate={() => setActiveVideoId(video.id)}
              onCursorScaleChange={setCursorScale}
            />
          ))}
        </div>
        <div
          className="space-y-10 transition-transform duration-300 md:pt-32"
          style={{ transform: `translateY(${scrollY * 0.018}px)` }}
        >
          {rightColumnVideos.map((video) => (
            <FeedVideoCard
              key={video.id}
              index={1}
              locale={locale}
              video={video}
              liked={Boolean(likedIds[video.id])}
              onLike={() => void handleLike(video.id)}
              onOpenComments={() => void openComments(video)}
              onActivate={() => setActiveVideoId(video.id)}
              onCursorScaleChange={setCursorScale}
            />
          ))}
        </div>
      </section>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 transition",
          commentTarget ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto max-h-[78vh] w-full max-w-4xl rounded-t-[32px] border border-[var(--avp-border)] bg-[rgba(2,8,20,0.94)] px-5 pb-8 pt-5 shadow-[0_-24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--avp-text-muted)]">
                {locale === "zh" ? "评论区" : "Comments"}
              </p>
              <h2 className="text-lg font-semibold text-[var(--avp-text)]">
                {commentTarget?.title[locale] ?? ""}
              </h2>
            </div>
            <JellyButton
              type="button"
              tone="ghost"
              onClick={closeComments}
              className="text-sm text-[#114f99]"
            >
              {locale === "zh" ? "关闭" : "Close"}
            </JellyButton>
          </div>

          <div className="mb-5 max-h-[40vh] space-y-3 overflow-y-auto pr-1">
            {commentList.map((comment) => (
              <article
                key={comment.id}
                className="rounded-[22px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-4"
              >
                <div className="mb-2 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-[var(--avp-text-muted)]">
                  <span>{comment.nickname}</span>
                  {comment.seed ? (
                    <span className="rounded-full border border-[var(--avp-border)] px-2 py-1 text-[10px] text-[#8cc0ff]">
                      {locale === "zh" ? "种子评论" : "Seed"}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm leading-7 text-[var(--avp-text)]">{comment.body}</p>
              </article>
            ))}
          </div>

          <form onSubmit={submitComment} className="grid gap-3 sm:grid-cols-[180px_1fr_auto]">
            <input
              value={commentState.nickname}
              onChange={(event) =>
                setCommentState((current) => ({
                  ...current,
                  nickname: event.target.value,
                }))
              }
              className="rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text)] outline-none transition placeholder:text-[var(--avp-text-muted)] focus:border-[var(--avp-border-strong)]"
              placeholder={locale === "zh" ? "你的昵称" : "Nickname"}
              required
            />
            <input
              value={commentState.body}
              onChange={(event) =>
                setCommentState((current) => ({
                  ...current,
                  body: event.target.value,
                }))
              }
              className="rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text)] outline-none transition placeholder:text-[var(--avp-text-muted)] focus:border-[var(--avp-border-strong)]"
              placeholder={
                locale === "zh"
                  ? "说说你对这个视频的看法..."
                  : "Drop a comment on this video..."
              }
              required
            />
            <JellyButton
              type="submit"
              disabled={isCommentBusy}
              className="disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCommentBusy
                ? locale === "zh"
                  ? "发送中..."
                  : "Sending..."
                : locale === "zh"
                  ? "发送"
                  : "Post"}
            </JellyButton>
          </form>
        </div>
      </div>

      <section className="mt-52 pt-8 space-y-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--avp-text-muted)]">
              {locale === "zh" ? "SHOWCASE" : "SHOWCASE"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--avp-text)] sm:text-4xl">
              {locale === "zh" ? "优秀案例" : "Featured Cases"}
            </h2>
          </div>
          <JellyButton tone="ghost" className="mt-1 shrink-0 self-start text-sm text-[#114f99]">
            {locale === "zh" ? "查看更多" : "View more"}
          </JellyButton>
        </div>

        <div className="grid gap-6 pt-2 xl:grid-cols-[320px_repeat(3,minmax(0,1fr))]">
          <FeaturedRankingCard locale={locale} videos={videos.slice(0, 4)} />

          {videos.slice(0, 3).map((video, index) => (
            <FeaturedCaseCard
              key={video.id}
              locale={locale}
              video={video}
              featuredCount={12 + index * 9}
            />
          ))}
        </div>
      </section>
    </>
  );
}

function FeaturedRankingCard({
  locale,
  videos,
}: {
  locale: Locale;
  videos: FeedVideoItem[];
}) {
  return (
    <article className="overflow-hidden rounded-[26px] border border-[rgba(165,215,255,0.18)] bg-[linear-gradient(180deg,rgba(55,104,255,0.96),rgba(37,69,205,0.96))] shadow-[0_24px_60px_rgba(12,28,94,0.28)]">
      <div className="grid h-full grid-rows-[140px_1fr]">
        <div className="flex items-start justify-between p-5">
          <div className="rounded-[20px] bg-black/88 px-4 py-3 text-white">
            <p className="text-sm font-semibold leading-5">
              {locale === "zh" ? "优秀" : "Featured"}
              <br />
              {locale === "zh" ? "案例榜" : "Case List"}
            </p>
          </div>
          <div className="text-right text-white">
            <p className="text-2xl font-semibold">{locale === "zh" ? "案例榜" : "Top Picks"}</p>
            <p className="mt-2 text-sm text-white/78">
              {locale === "zh" ? "本周高表现短片" : "High-performing shorts this week"}
            </p>
          </div>
        </div>

        <div className="space-y-4 px-4 pb-4">
          {videos.map((video, index) => (
            <div
              key={video.id}
              className="grid grid-cols-[44px_64px_minmax(0,1fr)] items-center gap-3 rounded-[18px] bg-white/92 px-3 py-3 text-[#1b2650]"
            >
              <div className="text-2xl font-semibold">{index + 1}</div>
              <div className="relative h-12 overflow-hidden rounded-[12px]">
                <Image
                  src={video.posterUrl}
                  alt={video.title[locale]}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{video.title[locale]}</p>
                <p className="mt-1 text-sm text-[#46527f]">
                  {locale === "zh" ? "短片案例精选" : "Short-form showcase"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}

function FeaturedCaseCard({
  locale,
  video,
  featuredCount,
}: {
  locale: Locale;
  video: FeedVideoItem;
  featuredCount: number;
}) {
  return (
    <article className="grid h-full grid-rows-[auto_auto_auto_1fr_auto] rounded-[26px] border border-[rgba(165,215,255,0.16)] bg-[rgba(7,17,40,0.56)] p-5 shadow-[0_22px_50px_rgba(0,0,0,0.2)] backdrop-blur-xl">
      <div className="relative mb-5 h-20 overflow-hidden rounded-[18px]">
        <Image
          src={video.posterUrl}
          alt={video.title[locale]}
          fill
          sizes="(min-width: 1280px) 18vw, 100vw"
          className="object-cover"
        />
      </div>

      <div className="mb-5 flex items-center gap-3">
        <div className="relative h-16 w-16 overflow-hidden rounded-full border-4 border-white/90 shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
          <Image
            src={video.posterUrl}
            alt={video.title[locale]}
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-2xl font-semibold text-[var(--avp-text)]">
            {video.title[locale]}
          </h3>
          <p className="mt-1 text-sm text-[var(--avp-text-muted)]">
            {locale === "zh" ? "导演 / 案例创作者" : "Director / Case creator"}
          </p>
        </div>
      </div>

      <div className="mb-5 space-y-2 text-sm text-[var(--avp-text-muted)]">
        <p>{locale === "zh" ? "短片风格：高级感 AI 影像" : "Style: premium AI visual storytelling"}</p>
        <p className="font-semibold text-[var(--avp-text)]">
          {featuredCount} {locale === "zh" ? "作品" : "works"} | {video.likesCount + 20}{" "}
          {locale === "zh" ? "热度" : "signals"}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-2 self-start">
        {[video.posterUrl, video.posterUrl, video.posterUrl, video.posterUrl].map((poster, index) => (
          <div key={`${video.id}-${index}`} className="relative aspect-[4/3] overflow-hidden rounded-[12px]">
            <Image
              src={poster}
              alt={video.title[locale]}
              fill
              sizes="120px"
              className="object-cover"
            />
            {index === 3 ? (
              <div className="absolute inset-0 flex items-center justify-center bg-[rgba(3,18,46,0.48)] text-lg font-semibold text-white">
                +{featuredCount}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-auto flex justify-end">
        <JellyButton
          href={`/create?template=${video.templateSlug}&from=${video.id}&lang=${locale}`}
          className="min-w-[120px]"
        >
          {locale === "zh" ? "View" : "View"}
        </JellyButton>
      </div>
    </article>
  );
}

function FeedVideoCard({
  index,
  locale,
  video,
  liked,
  onLike,
  onOpenComments,
  onActivate,
  onCursorScaleChange,
}: {
  index: number;
  locale: Locale;
  video: FeedVideoItem;
  liked: boolean;
  onLike: () => void;
  onOpenComments: () => void;
  onActivate: () => void;
  onCursorScaleChange: (scale: number) => void;
}) {
  const previewType = video.videoUrl.endsWith(".ogv") ? "video/ogg" : "video/webm";
  const [tiltStyle, setTiltStyle] = useState({
    rotateX: 0,
    translateY: 0,
    scale: 1,
  });

  useEffect(() => {
    const element = document.querySelector<HTMLElement>(`[data-feed-card-id="${video.id}"]`);
    if (!element) return;

    const updateTilt = () => {
      const rect = element.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const center = rect.top + rect.height / 2;
      const progress = (center / viewport - 0.5) * 2;
      const clamped = Math.max(-1, Math.min(1, progress));

      setTiltStyle({
        rotateX: -clamped * 5,
        translateY: clamped * 6,
        scale: 1 - Math.abs(clamped) * 0.012,
      });
    };

    updateTilt();
    window.addEventListener("scroll", updateTilt, { passive: true });
    window.addEventListener("resize", updateTilt);

    return () => {
      window.removeEventListener("scroll", updateTilt);
      window.removeEventListener("resize", updateTilt);
    };
  }, [video.id]);

  function handleMouseEnter(event: React.MouseEvent<HTMLElement>) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
    const node = event.currentTarget.querySelector("video");
    onActivate();
    onCursorScaleChange(1.2);
    if (!(node instanceof HTMLVideoElement)) return;
    void node.play().catch(() => {});
    captureClientEvent(TRACKING_EVENTS.videoHoverPlay, {
      videoId: video.id,
    });
  }

  function handleMouseLeave(event: React.MouseEvent<HTMLElement>) {
    const node = event.currentTarget.querySelector("video");
    onCursorScaleChange(1);
    if (!(node instanceof HTMLVideoElement)) return;
    node.pause();
    node.currentTime = 0;
  }

  return (
    <article
      data-feed-card
      data-feed-card-id={video.id}
      onMouseMove={onActivate}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "group relative overflow-hidden rounded-[18px] border border-[var(--avp-border)] bg-[var(--avp-surface-strong)] shadow-[0_22px_60px_rgba(0,0,0,0.28)] transition duration-500 hover:border-[var(--avp-border-strong)]",
        index === 0 ? "md:ml-auto md:mr-0 md:w-[88%] lg:w-[86%]" : "md:mr-auto md:ml-0 md:w-[90%] lg:w-[88%]",
      )}
      style={{
        transform: `perspective(1200px) rotateX(${tiltStyle.rotateX}deg) translateY(${tiltStyle.translateY}px) scale(${tiltStyle.scale})`,
      }}
    >
      <div
        className={cn(
          "relative mx-auto aspect-[9/16] w-full overflow-hidden",
        )}
      >
        <Image
          src={video.posterUrl}
          alt={video.title[locale]}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="absolute inset-0 scale-105 object-cover transition duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#021126]/8 via-transparent to-[#02050d]/90" />
        {video.videoUrl ? (
          <video
            muted
            loop
            playsInline
            preload="metadata"
            poster={video.posterUrl}
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={video.videoUrl} type={previewType} />
          </video>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[rgba(2,8,20,0.74)] px-6 text-center">
            <p className="text-sm leading-6 text-[var(--avp-text-muted)]">
              {locale === "zh"
                ? "等待团队补充真实视频素材"
                : "Waiting for the team to provide the real video asset"}
            </p>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 p-4">
          <div className="inline-flex rounded-full border border-white/12 bg-[rgba(0,0,0,0.32)] px-3 py-1 text-[10px] uppercase tracking-[0.26em] text-white/88">
            {locale === "zh" ? "WATCH" : "WATCH"}
          </div>
        </div>

      </div>

      <div className="border-t border-[rgba(165,215,255,0.1)] bg-[linear-gradient(180deg,rgba(5,20,54,0.96),rgba(3,11,29,0.98))] px-5 py-4">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--avp-text-muted)]">
              {locale === "zh" ? "AI VIDEO PRO" : "AI VIDEO PRO"}
            </p>
            <h2 className="mt-2 text-xl font-semibold leading-tight text-white sm:text-2xl">
              {video.title[locale]}
            </h2>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onLike}
                className={cn(
                  "pointer-events-auto inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition",
                  liked
                    ? "border-[var(--avp-border-strong)] bg-[rgba(79,153,255,0.22)] text-[#d9ebff]"
                    : "border-[var(--avp-border)] bg-[rgba(0,26,66,0.48)] text-[var(--avp-text)] hover:border-[var(--avp-border-strong)] hover:bg-[rgba(0,26,66,0.66)]",
                )}
                onMouseEnter={() => onCursorScaleChange(1.45)}
                onMouseLeave={() => onCursorScaleChange(1.2)}
              >
                <Heart className={cn("h-4 w-4", liked ? "fill-current text-[var(--gold)]" : "")} />
                <span>{video.likesCount}</span>
              </button>

              <button
                type="button"
                onClick={onOpenComments}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[var(--avp-border)] bg-[rgba(0,26,66,0.48)] px-3 py-2 text-xs font-medium text-[var(--avp-text)] transition hover:border-[var(--avp-border-strong)] hover:bg-[rgba(0,26,66,0.66)]"
                onMouseEnter={() => onCursorScaleChange(1.45)}
                onMouseLeave={() => onCursorScaleChange(1.2)}
              >
                <MessageCircle className="h-4 w-4" />
                <span>{video.commentsCount}</span>
              </button>
            </div>

            <CreepyActionButton
              href={`/create?template=${video.templateSlug}&from=${video.id}&lang=${locale}`}
              intensity="subtle"
              className="pointer-events-auto inline-flex items-center gap-2 text-sm"
              onMouseEnter={() => onCursorScaleChange(1.6)}
              onMouseLeave={() => onCursorScaleChange(1.2)}
            >
              <span>{locale === "zh" ? "进入工作台" : "Open studio"}</span>
            </CreepyActionButton>
          </div>
        </div>
      </div>
    </article>
  );
}
