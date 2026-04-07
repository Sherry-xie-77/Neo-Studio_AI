"use client";

import { Heart, MessageCircle, WandSparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { captureClientEvent } from "@/lib/client/posthog";
import { TRACKING_EVENTS } from "@/lib/constants";
import { type FeedVideoItem, type Locale, type VideoComment } from "@/lib/types";
import { cn } from "@/lib/utils";

type FeedClientProps = {
  locale: Locale;
  initialVideos: FeedVideoItem[];
  initialComments: Record<string, VideoComment[]>;
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
}: FeedClientProps) {
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

  useEffect(() => {
    captureClientEvent(TRACKING_EVENTS.feedView, {
      locale,
      sessionId,
      videoCount: initialVideos.length,
    });
  }, [initialVideos.length, locale, sessionId]);

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-feed-card]"));
    const mobile = window.matchMedia("(max-width: 768px)").matches;
    if (!mobile) return;

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
      { threshold: 0.55 },
    );

    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [videos]);

  const commentList = useMemo(
    () => (commentTarget ? commentsByVideo[commentTarget.id] ?? [] : []),
    [commentTarget, commentsByVideo],
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

  async function openComments(video: FeedVideoItem) {
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
    setCommentTarget(video);
    captureClientEvent(TRACKING_EVENTS.commentPanelOpen, {
      sessionId,
      videoId: video.id,
    });
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
    setCommentState({ nickname: commentState.nickname, body: "" });
    captureClientEvent(TRACKING_EVENTS.commentSubmit, {
      sessionId,
      videoId: commentTarget.id,
    });
  }

  return (
    <>
      <section className="mb-6 flex items-end justify-between gap-4">
        <div className="max-w-3xl space-y-2">
          <h1 className="text-2xl font-semibold leading-tight text-stone-50 sm:text-3xl lg:text-4xl">
            {locale === "zh"
              ? "像刷抖音、小红书一样刷 AI 视频，然后点进去一键复刻。"
              : "Scroll AI videos like TikTok or RedNote, then jump straight into remake mode."}
          </h1>
          <p className="text-sm leading-7 text-stone-400 sm:text-base">
            {locale === "zh"
              ? "桌面端悬停预览，移动端进入视口自动播放。点赞和评论留在首页，使用模板直接进创作页。"
              : "Hover to preview on desktop. Autoplay in-view on mobile. Like and comment stay in-feed, while remix jumps straight into create."}
          </p>
        </div>
        <div className="hidden text-right text-xs uppercase tracking-[0.22em] text-stone-500 sm:block">
          <p>{locale === "zh" ? "桌面端默认四列" : "4-up desktop feed"}</p>
          <p>{locale === "zh" ? "移动端单列自动播放" : "1-up mobile autoplay"}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {videos.map((video) => (
          <FeedVideoCard
            key={video.id}
            locale={locale}
            video={video}
            liked={Boolean(likedIds[video.id])}
            onLike={() => void handleLike(video.id)}
            onOpenComments={() => void openComments(video)}
          />
        ))}
      </section>

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 transition",
          commentTarget ? "translate-y-0" : "translate-y-full",
        )}
      >
        <div className="mx-auto max-h-[78vh] w-full max-w-4xl rounded-t-[32px] border border-white/10 bg-[#0d0c13]/95 px-5 pb-8 pt-5 shadow-[0_-24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                {locale === "zh" ? "评论区" : "Comments"}
              </p>
              <h2 className="text-lg font-semibold text-stone-50">
                {commentTarget?.title[locale] ?? ""}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setCommentTarget(null)}
              className="rounded-full border border-white/12 px-4 py-2 text-sm text-stone-300 transition hover:border-white/30 hover:bg-white/6"
            >
              {locale === "zh" ? "关闭" : "Close"}
            </button>
          </div>

          <div className="mb-5 max-h-[40vh] space-y-3 overflow-y-auto pr-1">
            {commentList.map((comment) => (
              <article
                key={comment.id}
                className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"
              >
                <div className="mb-2 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-stone-500">
                  <span>{comment.nickname}</span>
                  {comment.seed ? (
                    <span className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-orange-200">
                      {locale === "zh" ? "种子评论" : "Seed"}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm leading-7 text-stone-200">{comment.body}</p>
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
              className="rounded-[18px] border border-white/12 bg-white/[0.03] px-4 py-3 text-sm text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-orange-200/60"
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
              className="rounded-[18px] border border-white/12 bg-white/[0.03] px-4 py-3 text-sm text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-orange-200/60"
              placeholder={
                locale === "zh"
                  ? "说说你对这个视频的看法..."
                  : "Drop a comment on this video..."
              }
              required
            />
            <button
              type="submit"
              disabled={isCommentBusy}
              className="rounded-full bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCommentBusy
                ? locale === "zh"
                  ? "发送中..."
                  : "Sending..."
                : locale === "zh"
                  ? "发送"
                  : "Post"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function FeedVideoCard({
  locale,
  video,
  liked,
  onLike,
  onOpenComments,
}: {
  locale: Locale;
  video: FeedVideoItem;
  liked: boolean;
  onLike: () => void;
  onOpenComments: () => void;
}) {
  const previewType = video.videoUrl.endsWith(".ogv") ? "video/ogg" : "video/webm";

  function handleMouseEnter(event: React.MouseEvent<HTMLElement>) {
    const node = event.currentTarget.querySelector("video");
    if (!(node instanceof HTMLVideoElement)) return;
    void node.play().catch(() => {});
    captureClientEvent(TRACKING_EVENTS.videoHoverPlay, {
      videoId: video.id,
    });
  }

  function handleMouseLeave(event: React.MouseEvent<HTMLElement>) {
    const node = event.currentTarget.querySelector("video");
    if (!(node instanceof HTMLVideoElement)) return;
    node.pause();
    node.currentTime = 0;
  }

  return (
    <article
      data-feed-card
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative overflow-hidden rounded-[28px] border border-white/8 bg-black/40"
    >
      <div className="relative aspect-[9/16] overflow-hidden">
        <Image
          src={video.posterUrl}
          alt={video.title[locale]}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="absolute inset-0 scale-110 object-cover blur-2xl opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/0 to-black/70" />
        {video.videoUrl ? (
          <video
            muted
            loop
            playsInline
            preload="metadata"
            poster={video.posterUrl}
            className="absolute inset-0 h-full w-full object-contain"
          >
            <source src={video.videoUrl} type={previewType} />
          </video>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 px-6 text-center">
            <p className="text-sm leading-6 text-stone-300">
              {locale === "zh"
                ? "等待团队补充真实视频素材"
                : "Waiting for the team to provide the real video asset"}
            </p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 p-4 opacity-0 transition group-hover:opacity-100 md:group-hover:opacity-100">
          <div className="inline-flex rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-stone-200">
            {video.title[locale]}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onLike}
                className={cn(
                  "pointer-events-auto inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition",
                  liked
                    ? "border-orange-300/50 bg-orange-300/15 text-orange-100"
                    : "border-white/10 bg-black/35 text-stone-200 hover:border-white/25 hover:bg-black/55",
                )}
              >
                <Heart className={cn("h-4 w-4", liked ? "fill-current" : "")} />
                <span>{video.likesCount}</span>
              </button>

              <button
                type="button"
                onClick={onOpenComments}
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-2 text-xs font-medium text-stone-200 transition hover:border-white/25 hover:bg-black/55"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{video.commentsCount}</span>
              </button>
            </div>

            <Link
              href={`/create?template=${video.templateSlug}&from=${video.id}&lang=${locale}`}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-stone-100 px-4 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-200"
            >
              <WandSparkles className="h-4 w-4" />
              <span>{locale === "zh" ? "使用模板" : "Use template"}</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
