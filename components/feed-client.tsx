"use client";

import { Heart, MessageCircle, WandSparkles, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { captureClientEvent } from "@/lib/client/posthog";
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

function buildTagRail(videos: FeedVideoItem[], locale: Locale) {
  const tags = new Set<string>();
  videos.forEach((video) => {
    video.useCases?.forEach((useCase) => {
      tags.add(useCase[locale]);
    });
  });

  return [
    { value: "all", label: locale === "zh" ? "推荐" : "For you" },
    ...Array.from(tags).slice(0, 8).map((tag) => ({
      value: tag,
      label: tag,
    })),
  ];
}

export function FeedClient({
  locale,
  initialVideos,
  initialComments,
  initialFilters,
}: FeedClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
  const [activeTag, setActiveTag] = useState(initialFilters.tag ?? "all");
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  const tagRail = useMemo(() => buildTagRail(videos, locale), [locale, videos]);

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
    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", locale);

    if (activeTag === "all") {
      params.delete("tag");
    } else {
      params.set("tag", activeTag);
    }

    params.delete("intent");
    params.delete("sort");

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeTag, locale, pathname, router, searchParams]);

  const filteredVideos = useMemo(() => {
    if (activeTag === "all") return videos;
    return videos.filter((video) =>
      video.useCases?.some((useCase) => useCase[locale] === activeTag),
    );
  }, [activeTag, locale, videos]);

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
    lastTriggerRef.current = trigger ?? null;
    setCommentTarget(video);
    captureClientEvent(TRACKING_EVENTS.commentPanelOpen, {
      sessionId,
      videoId: video.id,
    });
  }

  function closeComments() {
    setCommentTarget(null);
    window.setTimeout(() => {
      lastTriggerRef.current?.focus();
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
      <section className="mb-5 flex items-center gap-2 overflow-x-auto pb-2">
        {tagRail.map((tag) => (
          <button
            key={tag.value}
            type="button"
            aria-pressed={activeTag === tag.value}
            onClick={() => setActiveTag(tag.value)}
            className={cn(
              "inline-flex min-h-[44px] shrink-0 items-center rounded-full border px-4 text-sm",
              activeTag === tag.value
                ? "border-[var(--line-strong)] bg-[var(--gold-soft)] text-[var(--text)]"
                : "border-[var(--line)] bg-white/3 text-[var(--text-muted)]",
            )}
          >
            {tag.label}
          </button>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {filteredVideos.map((video) => (
          <FeedVideoCard
            key={video.id}
            locale={locale}
            video={video}
            liked={Boolean(likedIds[video.id])}
            onLike={() => void handleLike(video.id)}
            onOpenComments={(trigger) => void openComments(video, trigger)}
          />
        ))}
      </section>

      <CommentSheet
        locale={locale}
        commentTarget={commentTarget}
        commentList={commentList}
        commentState={commentState}
        isCommentBusy={isCommentBusy}
        onClose={closeComments}
        onStateChange={setCommentState}
        onSubmit={submitComment}
      />
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
  onOpenComments: (trigger: HTMLButtonElement | null) => void;
}) {
  const commentButtonRef = useRef<HTMLButtonElement | null>(null);
  const previewType = video.videoUrl.endsWith(".ogv") ? "video/ogg" : "video/webm";

  function handleMouseEnter(event: React.MouseEvent<HTMLElement>) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/0 to-black/75" />
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
            <p className="text-sm leading-6 text-[var(--text-muted)]">
              {locale === "zh" ? "预览暂不可用" : "Preview unavailable"}
            </p>
          </div>
        )}

        <div className="absolute inset-x-0 top-0 p-4">
          <div className="inline-flex rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/90">
            {video.trendLabel?.[locale] ?? video.title[locale]}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onLike}
                className={cn(
                  "pointer-events-auto inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition",
                  liked
                    ? "border-[var(--line-strong)] bg-[var(--gold-soft)] text-[var(--text)]"
                    : "border-white/10 bg-black/35 text-stone-200 hover:border-white/25 hover:bg-black/55",
                )}
              >
                <Heart className={cn("h-4 w-4", liked ? "fill-current text-[var(--gold)]" : "")} />
                <span>{video.likesCount}</span>
              </button>

              <button
                ref={commentButtonRef}
                type="button"
                onClick={() => onOpenComments(commentButtonRef.current)}
                className="pointer-events-auto inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-2 text-xs font-medium text-stone-200 transition hover:border-white/25 hover:bg-black/55"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{video.commentsCount}</span>
              </button>
            </div>

            <Link
              href={`/create?template=${video.templateSlug}&from=${video.id}&lang=${locale}`}
              className="pointer-events-auto inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/12 bg-black/40 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/24 hover:bg-black/55"
            >
              <WandSparkles className="h-4 w-4" />
              <span>{locale === "zh" ? "去创作" : "Create"}</span>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function CommentSheet({
  locale,
  commentTarget,
  commentList,
  commentState,
  isCommentBusy,
  onClose,
  onStateChange,
  onSubmit,
}: {
  locale: Locale;
  commentTarget: FeedVideoItem | null;
  commentList: VideoComment[];
  commentState: CommentState;
  isCommentBusy: boolean;
  onClose: () => void;
  onStateChange: React.Dispatch<React.SetStateAction<CommentState>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 transition",
        commentTarget ? "pointer-events-auto bg-black/55" : "pointer-events-none bg-black/0",
      )}
      aria-hidden={commentTarget ? undefined : true}
    >
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 w-full transition duration-300 xl:inset-y-0 xl:left-auto xl:right-4 xl:top-24 xl:max-w-[420px]",
          commentTarget ? "translate-y-0 opacity-100 xl:translate-x-0" : "translate-y-full opacity-0 xl:translate-x-8 xl:translate-y-0",
        )}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={locale === "zh" ? "评论面板" : "Comments panel"}
          className="neo-panel neo-scrollbar max-h-[82vh] overflow-y-auto rounded-b-none p-5 pb-8 sm:p-6 xl:h-[calc(100vh-8rem)] xl:rounded-[2rem]"
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-soft)]">
                {locale === "zh" ? "评论" : "Comments"}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--text)]">
                {commentTarget?.title[locale] ?? ""}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="neo-button-secondary inline-flex min-w-[44px] items-center justify-center px-3"
              aria-label={locale === "zh" ? "关闭评论" : "Close comments"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="neo-scrollbar mb-5 max-h-[42vh] space-y-3 overflow-y-auto pr-1 xl:max-h-[46vh]">
            {commentList.map((comment) => (
              <article key={comment.id} className="neo-card p-4">
                <div className="mb-2 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-[var(--text-soft)]">
                  <span>{comment.nickname}</span>
                  {comment.seed ? (
                    <span className="rounded-full border border-[var(--line)] bg-[var(--gold-soft)] px-2 py-1 text-[10px] text-[var(--gold)]">
                      {locale === "zh" ? "种子" : "Seed"}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm leading-7 text-[var(--text-muted)]">{comment.body}</p>
              </article>
            ))}
          </div>

          <form onSubmit={onSubmit} className="grid gap-3">
            <input
              value={commentState.nickname}
              onChange={(event) =>
                onStateChange((current) => ({
                  ...current,
                  nickname: event.target.value,
                }))
              }
              className="neo-input"
              placeholder={locale === "zh" ? "昵称" : "Nickname"}
              autoComplete="nickname"
              required
            />
            <textarea
              value={commentState.body}
              onChange={(event) =>
                onStateChange((current) => ({
                  ...current,
                  body: event.target.value,
                }))
              }
              className="neo-input min-h-28 resize-y"
              placeholder={locale === "zh" ? "说点什么…" : "Say something…"}
              required
            />
            <button type="submit" disabled={isCommentBusy} className="neo-button-primary px-5 text-sm font-semibold disabled:opacity-60">
              {isCommentBusy
                ? locale === "zh"
                  ? "发送中…"
                  : "Sending…"
                : locale === "zh"
                  ? "发送"
                  : "Post"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
