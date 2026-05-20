"use client";

import { ExternalLink, Heart, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { captureClientEvent } from "@/lib/client/posthog";
import { CreepyActionButton } from "@/components/creepy-action-button";
import { JellyButton } from "@/components/jelly-button";
import { TRACKING_EVENTS } from "@/lib/constants";
import { type FeaturedCase, type FeedVideoItem, type Locale, type VideoComment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getFirstEpisodeForVideo } from "@/lib/watch-series";

type FeedClientProps = {
  locale: Locale;
  initialVideos: FeedVideoItem[];
  initialComments: Record<string, VideoComment[]>;
  featuredCases: FeaturedCase[];
  initialFilters: {
    tag?: string;
    intent?: string;
    sort?: string;
  };
};

const briefFormula = ["Product", "Platform", "Quantity", "Style", "Materials", "Goal", "Timeline"];

type CustomAdPackage = {
  id: string;
  name: { zh: string; en: string };
  quantity: { zh: string; en: string };
  price: string;
  href: string;
  cta?: { zh: string; en: string };
  description: { zh: string; en: string };
  revealPriceOnClick?: boolean;
};

const customAdPackages: CustomAdPackage[] = [
  {
    id: "starter",
    name: { zh: "入门试投", en: "Starter Test" },
    quantity: { zh: "3 条广告视频", en: "3 ad videos" },
    price: "$12.99",
    href: "https://buy.stripe.com/6oU5kE1F24ZWgiBeT39AA03",
    description: {
      zh: "先用 3 条素材验证一个产品卖点，适合低成本测试点击、询盘和下单意愿。",
      en: "Validate one product angle with 3 low-cost creatives built to test clicks, leads, and purchase intent.",
    },
  },
  {
    id: "hook",
    name: { zh: "爆款测试", en: "Hook Test" },
    quantity: { zh: "5 条广告视频", en: "5 ad videos" },
    price: "$19.99",
    href: "https://buy.stripe.com/cNi6oIbfC640fex6mx9AA04",
    description: {
      zh: "一次测试多个开头、痛点和购买理由，更快找到值得加预算的素材方向。",
      en: "Test more hooks, pain points, and reasons to buy so you can spot the creative worth scaling.",
    },
  },
  {
    id: "scale",
    name: { zh: "批量投放", en: "Scale Pack" },
    quantity: { zh: "10 条广告视频", en: "10 ad videos" },
    price: "$39.99",
    href: "https://buy.stripe.com/3cI5kE0AYcso0jD9yJ9AA05",
    description: {
      zh: "给 TikTok、Reels、Shorts 和广告账户准备一组可轮换素材，持续测出更高转化。",
      en: "Stock TikTok, Reels, Shorts, and ad accounts with rotating creatives for stronger conversion tests.",
    },
  },
  {
    id: "drama",
    name: { zh: "定制短剧", en: "Custom Drama" },
    quantity: { zh: "20 集品牌短剧", en: "20 branded drama episodes" },
    price: "$699",
    href: "/custom-ads/brief",
    cta: { zh: "定制短剧", en: "Customize drama" },
    description: {
      zh: "把产品写进连续剧情，用 20 集内容持续种草、涨粉和转化，适合品牌账号长期投放。",
      en: "Turn your product into a 20-episode story that builds demand, followers, and conversions over time.",
    },
    revealPriceOnClick: true,
  },
];

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
  featuredCases,
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
  const [cursorScale, setCursorScale] = useState(1);
  const [scrollY, setScrollY] = useState(0);
  const [showCustomAdPricing, setShowCustomAdPricing] = useState(false);
  const [revealedPriceIds, setRevealedPriceIds] = useState<Record<string, boolean>>({});
  const lastTriggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const watchCursorRef = useRef<HTMLDivElement | null>(null);
  const cursorPositionRef = useRef({ x: 0, y: 0 });
  const cursorFrameRef = useRef<number | null>(null);
  const cursorTrackingRef = useRef(false);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("open") !== "paywall") return;

    const frameId = window.requestAnimationFrame(() => {
      document.getElementById("paywall")?.scrollIntoView({ block: "start" });
      setShowCustomAdPricing(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  function setCursorPosition(x: number, y: number) {
    cursorPositionRef.current = { x, y };
  }

  useEffect(() => {
    if (!showWatchCursor) return;

    function renderCursorPosition() {
      cursorFrameRef.current = null;
      const cursor = watchCursorRef.current;
      if (!cursor) return;
      const { x, y } = cursorPositionRef.current;
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    }

    function updateCursorPosition(x: number, y: number) {
      cursorPositionRef.current = { x, y };
      if (cursorFrameRef.current !== null) return;
      cursorFrameRef.current = window.requestAnimationFrame(renderCursorPosition);
    }

    const handlePointerMove = (event: Event) => {
      if (!cursorTrackingRef.current || !(event instanceof PointerEvent)) return;
      const coalescedEvents = event.getCoalescedEvents?.();
      const latestEvent = coalescedEvents?.[coalescedEvents.length - 1] ?? event;
      updateCursorPosition(latestEvent.clientX, latestEvent.clientY);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerrawupdate", handlePointerMove, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerrawupdate", handlePointerMove);
      if (cursorFrameRef.current !== null) {
        window.cancelAnimationFrame(cursorFrameRef.current);
        cursorFrameRef.current = null;
      }
    };
  }, [showWatchCursor]);

  useEffect(() => {
    const cursor = watchCursorRef.current;
    if (!cursor) return;

    const { x, y } = cursorPositionRef.current;
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  }, [showWatchCursor]);

  const commentList = useMemo(
    () => (commentTarget ? commentsByVideo[commentTarget.id] ?? [] : []),
    [commentTarget, commentsByVideo],
  );
  const activeVideo =
    videos.find((video) => video.id === activeVideoId) ?? videos[0] ?? null;
  const firstEpisodeByVideoId = useMemo(() => {
    const firstById = new Map<string, FeedVideoItem>();
    for (const video of videos) {
      firstById.set(video.id, getFirstEpisodeForVideo(video, videos));
    }
    return firstById;
  }, [videos]);
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
          ref={watchCursorRef}
          className="pointer-events-none fixed left-0 top-0 z-[70] hidden will-change-transform md:block"
          style={{
            opacity: activeVideo ? 1 : 0,
          }}
        >
          <div
            className="flex h-18 w-18 items-center justify-center rounded-full border border-white/15 bg-white/75 text-xs font-semibold uppercase tracking-[0.16em] text-[#001a42] mix-blend-screen transition-transform duration-75 will-change-transform"
            style={{
              transform: `scale(${cursorScale})`,
            }}
          >
            WATCH
          </div>
        </div>
      ) : null}

      <section className="mb-10 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_220px] lg:items-start">
        <div className="space-y-3 pt-2">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--avp-text-muted)]">
            {locale === "zh" ? "百万曝光 · 真实出单" : "MILLIONS OF VIEWS · REAL SALES"}
          </p>
          <p className="text-sm leading-7 text-[var(--avp-text-muted)]">
            {locale === "zh"
              ? "已经帮上百个品牌跑出单条破百万播放、单月翻倍出单的爆款素材，下一个就是你的产品。"
              : "We've helped 100+ brands ship creatives that crossed 1M+ views and doubled monthly orders. Your product is next."}
          </p>
        </div>

        <div className="space-y-4 text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--avp-text-muted)]">
            {locale === "zh" ? "今天下单，最快 7 天上线投放" : "ORDER TODAY · LIVE IN 7 DAYS"}
          </p>
          <h1 className="text-4xl font-semibold uppercase leading-none text-[var(--avp-text)] sm:text-5xl lg:text-6xl">
            {locale === "zh" ? "在这里做的视频，都是百万曝光起步的爆款" : "Videos built here go viral and sell"}
          </h1>
          <p className="mx-auto max-w-xl text-sm leading-7 text-[var(--avp-text-muted)]">
            {locale === "zh"
              ? "我们做的不是普通广告，是能让用户停下来、想买、马上下单的爆款视频。UGC 带货、TVC 质感大片、品牌短剧三合一，帮你打爆 TikTok、Reels、Shorts 和 Amazon 详情页。"
              : "We don't ship generic ads. We ship scroll-stopping, sell-now creatives — UGC, TVC, and branded drama — that blow up on TikTok, Reels, Shorts, and Amazon listings."}
          </p>
          <button type="button" onClick={() => setShowCustomAdPricing(true)} className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-[var(--avp-text)] px-5 text-sm font-bold text-[#061a36] shadow-[0_18px_42px_rgba(178,226,255,0.18)] transition hover:-translate-y-0.5">
            {locale === "zh" ? "立即下单做爆款" : "Order my viral video"}
          </button>
        </div>

        <div className="space-y-3 pt-2 text-right">
          <p className="text-[11px] uppercase tracking-[0.32em] text-[var(--avp-text-muted)]">
            {locale === "zh" ? "下单即排期 · 名额有限" : "BOOKED FAST · LIMITED SLOTS"}
          </p>
          <p className="text-sm leading-7 text-[var(--avp-text-muted)]">
            {locale === "zh"
              ? "电商品牌、跨境卖家、本地商家、内容账号都在用，每周接单名额有限，付款即锁定档期。"
              : "Used by ecommerce brands, cross-border sellers, local businesses, and creator accounts. Weekly slots are limited — payment locks your spot."}
          </p>
        </div>
      </section>

      <div id="custom-ads" className="scroll-mt-24" />

      <section id="paywall" className="mb-12 scroll-mt-24 overflow-hidden rounded-[32px] border border-[rgba(178,226,255,0.24)] bg-[linear-gradient(135deg,rgba(247,251,255,0.96),rgba(191,226,255,0.88)_46%,rgba(139,125,255,0.78))] p-5 text-[#061a36] shadow-[0_28px_80px_rgba(79,153,255,0.26)] sm:p-7">
        <div className="grid gap-7 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.32em] text-[#285084]">
                {locale === "zh" ? "百万曝光 · 出单加速" : "MILLIONS OF VIEWS · MORE ORDERS"}
              </p>
              <h2 className="text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
                {locale === "zh" ? "$12.99 起，让你的产品上热门、出大单" : "From $12.99 — go viral, sell more, today."}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-[#17345d] sm:text-base">
                {locale === "zh"
                  ? "把产品扔给我们，48 小时拿到能直接投放的爆款视频脚本和成片。UGC 带货、TVC 质感大片、20 集品牌短剧任选；已经帮上百个品牌跑出百万播放、订单翻倍。每周名额有限，付款即排期。"
                  : "Send us your product. In 48h you'll get viral-ready scripts and finished creatives — UGC, TVC, or a 20-episode branded drama. 100+ brands hit 1M+ views and doubled their orders. Weekly slots are limited — payment locks your spot."}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  zh: "UGC 带货爆款",
                  en: "UGC viral commerce",
                  descZh: "真实用户口吻、强钩子开头，让用户停下来想买。已跑出多条单条破百万播放的爆款。",
                  descEn: "Real-customer hooks that stop the scroll. Past creatives have crossed 1M+ views and lifted CTR.",
                },
                {
                  zh: "定制短剧",
                  en: "Custom drama",
                  descZh: "20 集品牌剧情，把产品自然植入故事，连续追更带来稳定涨粉和复购，长期账号增长首选。",
                  descEn: "20 branded episodes that turn your product into a story viewers come back for, driving steady follower growth and reorders.",
                },
                {
                  zh: "TVC 质感大片",
                  en: "TVC-quality films",
                  descZh: "电影级画面 + 强转化结构，用在官网、投放页和详情页，让客单价更高、退货更少。",
                  descEn: "Cinematic visuals built around a conversion script — perfect for landing pages and listings, lifting AOV and trust.",
                },
              ].map((item) => (
                <div key={item.zh} className="rounded-[24px] border border-[#0d3d7b]/15 bg-white/52 p-4 shadow-[0_18px_46px_rgba(6,26,54,0.08)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#285084]">{locale === "zh" ? "立即下单" : "ORDER NOW"}</p>
                  <h3 className="mt-3 text-2xl font-semibold text-[#061a36]">
                    {locale === "zh" ? item.zh : item.en}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#17345d]">
                    {locale === "zh" ? item.descZh : item.descEn}
                  </p>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => setShowCustomAdPricing(true)} className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#061a36] px-5 text-sm font-bold text-white shadow-[0_18px_42px_rgba(6,26,54,0.22)] transition hover:-translate-y-0.5">
              {locale === "zh" ? "立即下单做爆款" : "Order my viral video"}
            </button>
          </div>

          <div className="rounded-[26px] border border-[#0d3d7b]/15 bg-white/44 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-[#285084]">
              {locale === "zh" ? "付款后提交需求" : "AFTER PAYMENT"}
            </p>
            <p className="mt-3 text-sm leading-6 text-[#17345d]">
              {locale === "zh"
                ? "付款成功后会进入需求提交页，再打开邮件模板发送产品图片、购买套餐和投放需求。"
                : "After successful payment, continue to the brief page to open the email template and send product images, package details, and campaign requirements."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {briefFormula.map((item) => (
                <span key={item} className="rounded-full border border-[#0d3d7b]/14 bg-white/48 px-3 py-1.5 text-xs font-semibold text-[#061a36]">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12 space-y-8">
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
          {featuredCases.length ? (
            <>
              {featuredCases.length > 1 ? (
                <FeaturedCaseRankingCard locale={locale} cases={featuredCases.slice(0, 4)} />
              ) : null}
              {featuredCases.slice(0, featuredCases.length > 1 ? 3 : 1).map((item) => (
                <FeaturedCaseCard key={item.id} locale={locale} item={item} />
              ))}
            </>
          ) : (
            <>
              <FeaturedRankingCard locale={locale} videos={videos.slice(0, 4)} />
              {videos.slice(0, 3).map((video, index) => (
                <FallbackFeaturedCaseCard
                  key={video.id}
                  locale={locale}
                  video={video}
                  featuredCount={12 + index * 9}
                />
              ))}
            </>
          )}
        </div>
      </section>

      <section
        className={cn(
          "mb-12 grid grid-cols-1 gap-6 pb-16 md:grid-cols-2 md:gap-6 md:pb-20 lg:gap-8",
          showWatchCursor ? "cursor-none" : "",
        )}
        onPointerEnter={(event) => {
          cursorTrackingRef.current = true;
          setCursorPosition(event.clientX, event.clientY);
          setCursorScale(1);
        }}
        onMouseLeave={() => {
          cursorTrackingRef.current = false;
          setCursorScale(1);
        }}
      >
        <div
          className="space-y-9 transition-transform duration-300 md:pt-10"
          style={{ transform: `translateY(${scrollY * 0.016}px)` }}
        >
          {leftColumnVideos.map((video) => (
            <FeedVideoCard
              key={video.id}
              index={0}
              locale={locale}
              video={video}
              watchVideoId={firstEpisodeByVideoId.get(video.id)?.id ?? video.id}
              liked={Boolean(likedIds[video.id])}
              onLike={() => void handleLike(video.id)}
              onOpenComments={() => void openComments(video)}
              onActivate={() => setActiveVideoId(video.id)}
              onCursorScaleChange={setCursorScale}
            />
          ))}
        </div>
        <div
          className="space-y-9 transition-transform duration-300 md:pt-20"
          style={{ transform: `translateY(${scrollY * 0.018}px)` }}
        >
          {rightColumnVideos.map((video) => (
            <FeedVideoCard
              key={video.id}
              index={1}
              locale={locale}
              video={video}
              watchVideoId={firstEpisodeByVideoId.get(video.id)?.id ?? video.id}
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

      {showCustomAdPricing ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#020814]/70 px-4 pb-4 backdrop-blur-sm sm:items-center sm:pb-0">
          <div className="max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-[32px] border border-[rgba(178,226,255,0.24)] bg-[linear-gradient(135deg,rgba(247,251,255,0.98),rgba(191,226,255,0.94)_52%,rgba(139,125,255,0.86))] p-5 text-[#061a36] shadow-[0_32px_90px_rgba(0,0,0,0.34)] sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.32em] text-[#285084]">
                  {locale === "zh" ? "今天下单 · 7 天交付" : "ORDER TODAY · DELIVERED IN 7 DAYS"}
                </p>
                <h2 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">
                  {locale === "zh" ? "选一个套餐，把产品做成下一个百万爆款" : "Pick a package and turn your product into the next viral hit"}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[#17345d]">
                  {locale === "zh"
                    ? "$12.99 起就能跑出第一条爆款，长期账号增长选 20 集定制短剧。付款立即排期，提交产品图和投放目标，我们按 brief 制作并交付能直接投放的成片。"
                    : "Ship your first viral creative from $12.99, or lock long-term growth with the 20-episode custom drama. Payment locks your slot — send product images and goals and we deliver ad-ready cuts."}
                </p>
              </div>
              <button type="button" onClick={() => { setShowCustomAdPricing(false); setRevealedPriceIds({}); }} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#0d3d7b]/15 bg-white/60 text-lg font-semibold text-[#061a36] transition hover:bg-white/85" aria-label={locale === "zh" ? "关闭报价窗口" : "Close pricing modal"}>
                ×
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {customAdPackages.map((item) => {
                const isRevealPackage = Boolean(item.revealPriceOnClick);
                const isRevealed = Boolean(revealedPriceIds[item.id]);
                const targetHref = item.href.startsWith("/") ? `${item.href}?lang=${locale}` : item.href;
                const cardClass = "group flex min-h-[238px] flex-col justify-between rounded-[24px] border border-[#0d3d7b]/15 bg-white/62 p-4 shadow-[0_18px_46px_rgba(6,26,54,0.1)] transition hover:-translate-y-0.5 hover:bg-white/82";
                const ctaClass = "mt-5 inline-flex min-h-[42px] items-center justify-center rounded-full bg-[#061a36] px-4 text-sm font-bold text-white transition group-hover:translate-y-[-1px]";

                if (isRevealPackage && !isRevealed) {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setRevealedPriceIds((current) => ({ ...current, [item.id]: true }))}
                      className={`${cardClass} text-left`}
                    >
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#285084]">{item.name[locale]}</p>
                        <h3 className="mt-3 text-2xl font-semibold text-[#061a36]">{item.quantity[locale]}</h3>
                        <p className="mt-2 text-sm font-medium text-[#285084]">
                          {locale === "zh" ? "点击查看价格" : "Tap to view pricing"}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-[#17345d]">{item.description[locale]}</p>
                      </div>
                      <span className={ctaClass}>
                        {locale === "zh" ? "准备付费" : "Ready to pay"}
                      </span>
                    </button>
                  );
                }

                return (
                  <a
                    key={item.id}
                    href={targetHref}
                    target="_blank"
                    rel="noreferrer"
                    className={cardClass}
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#285084]">{item.name[locale]}</p>
                      <h3 className="mt-3 text-2xl font-semibold text-[#061a36]">{item.quantity[locale]}</h3>
                      <p className="mt-2 text-3xl font-bold text-[#0d3d7b]">{item.price}</p>
                      <p className="mt-3 text-sm leading-6 text-[#17345d]">{item.description[locale]}</p>
                    </div>
                    <span className={ctaClass}>
                      {item.cta?.[locale] ?? (locale === "zh" ? "立即购买" : "Buy now")}
                    </span>
                  </a>
                );
              })}
            </div>

            <div className="mt-5 rounded-[24px] border border-[#0d3d7b]/15 bg-white/46 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[#285084]">
                {locale === "zh" ? "付款后提交需求" : "AFTER PAYMENT"}
              </p>
              <p className="mt-3 text-sm leading-6 text-[#17345d]">
                {locale === "zh"
                  ? "付款成功后进入需求提交页，再打开邮件模板发送产品图片、购买套餐和投放需求。"
                  : "After successful payment, continue to the brief page to open the email template and send product images, package details, and campaign requirements."}
              </p>
            </div>
          </div>
        </div>
      ) : null}
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

function FeaturedCaseRankingCard({
  locale,
  cases,
}: {
  locale: Locale;
  cases: FeaturedCase[];
}) {
  return (
    <article className="overflow-hidden rounded-[26px] border border-[rgba(165,215,255,0.18)] bg-[linear-gradient(180deg,rgba(55,104,255,0.96),rgba(37,69,205,0.96))] shadow-[0_24px_60px_rgba(12,28,94,0.28)]">
      <div className="grid h-full grid-rows-[140px_1fr]">
        <div className="flex items-start justify-between p-5">
          <div className="rounded-[20px] bg-black/88 px-4 py-3 text-white">
            <p className="text-sm font-semibold leading-5">
              {locale === "zh" ? "成功" : "Success"}
              <br />
              {locale === "zh" ? "案例榜" : "Cases"}
            </p>
          </div>
          <div className="text-right text-white">
            <p className="text-2xl font-semibold">{locale === "zh" ? "案例榜" : "Top Cases"}</p>
            <p className="mt-2 text-sm text-white/78">
              {locale === "zh" ? "内部精选账号增长" : "Selected account growth"}
            </p>
          </div>
        </div>

        <div className="space-y-4 px-4 pb-4">
          {cases.map((item, index) => (
            <a
              key={item.id}
              href={item.accountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="grid grid-cols-[44px_64px_minmax(0,1fr)] items-center gap-3 rounded-[18px] bg-white/92 px-3 py-3 text-[#1b2650] transition hover:bg-white"
            >
              <div className="text-2xl font-semibold">{index + 1}</div>
              <div className="relative h-12 overflow-hidden rounded-[12px]">
                <Image
                  src={item.screenshotUrl}
                  alt={item.accountName}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{item.accountName}</p>
                <p className="mt-1 text-sm text-[#46527f]">{item.followers}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}

function formatCaseViews(value: string) {
  const parsed = Number.parseInt(value.replace(/[^0-9]/g, ""), 10);
  if (!Number.isFinite(parsed) || parsed < 1_000) return "1,200+";
  return value;
}

function FeaturedCaseCard({
  locale,
  item,
}: {
  locale: Locale;
  item: FeaturedCase;
}) {
  const hasUrl = Boolean(item.accountUrl);
  return (
    <article className="grid h-full grid-rows-[auto_auto_auto_1fr] rounded-[26px] border border-[rgba(165,215,255,0.16)] bg-[rgba(7,17,40,0.56)] p-5 shadow-[0_22px_50px_rgba(0,0,0,0.2)] backdrop-blur-xl transition hover:border-[var(--avp-border-strong)]">
      <div className="relative mb-5 h-20 overflow-hidden rounded-[18px]">
        <Image
          src={item.screenshotUrl}
          alt={item.accountName}
          fill
          sizes="(min-width: 1280px) 18vw, 100vw"
          className="object-cover"
        />
      </div>

      <div className="mb-5 flex items-center gap-3">
        <div className="relative h-16 w-16 overflow-hidden rounded-full border-4 border-white/90 shadow-[0_10px_24px_rgba(0,0,0,0.28)]">
          <Image
            src={item.screenshotUrl}
            alt={item.accountName}
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          {hasUrl ? (
            <a
              href={item.accountUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex max-w-full items-center gap-1.5 truncate text-2xl font-semibold text-[var(--avp-text)] transition hover:text-[#8cc0ff]"
            >
              <span className="truncate underline-offset-4 group-hover:underline">{item.accountName}</span>
              <ExternalLink className="h-4 w-4 shrink-0 opacity-70 transition group-hover:opacity-100" />
            </a>
          ) : (
            <h3 className="truncate text-2xl font-semibold text-[var(--avp-text)]">
              {item.accountName}
            </h3>
          )}
          <p className="mt-1 text-sm text-[var(--avp-text-muted)]">
            {locale === "zh" ? "账号主页案例" : "Account case study"}
          </p>
        </div>
      </div>

      <div className="mb-5 space-y-2 text-sm text-[var(--avp-text-muted)]">
        {hasUrl ? (
          <a
            href={item.accountUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex max-w-full items-center gap-1.5 font-semibold text-[var(--avp-text)] transition hover:text-[#8cc0ff]"
          >
            <span className="underline-offset-4 group-hover:underline">{item.title[locale]}</span>
            <ExternalLink className="h-4 w-4 shrink-0 opacity-70 transition group-hover:opacity-100" />
          </a>
        ) : (
          <p className="font-semibold text-[var(--avp-text)]">{item.title[locale]}</p>
        )}
        <p className="line-clamp-2">{item.summary[locale]}</p>
        <p className="font-semibold text-[var(--avp-text)]">
          {item.followers} {locale === "zh" ? "粉丝" : "followers"} | {formatCaseViews(item.totalViews)} {locale === "zh" ? "总曝光" : "views"}
        </p>
      </div>
    </article>
  );
}
function FallbackFeaturedCaseCard({
  locale,
  video,
  featuredCount,
}: {
  locale: Locale;
  video: FeedVideoItem;
  featuredCount: number;
}) {
  return (
    <article className="grid h-full grid-rows-[auto_auto_auto_1fr] rounded-[26px] border border-[rgba(165,215,255,0.16)] bg-[rgba(7,17,40,0.56)] p-5 shadow-[0_22px_50px_rgba(0,0,0,0.2)] backdrop-blur-xl">
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

    </article>
  );
}

function FeedVideoCard({
  index,
  locale,
  video,
  watchVideoId,
  liked,
  onLike,
  onOpenComments,
  onActivate,
  onCursorScaleChange,
}: {
  index: number;
  locale: Locale;
  video: FeedVideoItem;
  watchVideoId: string;
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
        index === 0 ? "md:ml-auto md:mr-0 md:w-[92%] lg:w-[90%]" : "md:mr-auto md:ml-0 md:w-[92%] lg:w-[90%]",
      )}
      style={{
        transform: `perspective(1200px) rotateX(${tiltStyle.rotateX}deg) translateY(${tiltStyle.translateY}px) scale(${tiltStyle.scale})`,
      }}
    >
      <Link
        href={`/watch/${watchVideoId}?lang=${locale}`}
        className={cn(
          "relative mx-auto block aspect-[9/16] w-full overflow-hidden",
        )}
        aria-label={locale === "zh" ? `从第一集观看 ${video.title[locale]}` : `Watch ${video.title[locale]} from episode 1`}
        onClick={() => {
          captureClientEvent(TRACKING_EVENTS.videoHoverPlay, {
            videoId: watchVideoId,
          });
        }}
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

      </Link>

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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
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

            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
              <JellyButton
                href={`/create?template=${video.templateSlug}&from=${video.id}&lang=${locale}`}
                tone="ghost"
                className="pointer-events-auto h-[3.4rem] w-full min-w-0 max-w-full sm:h-auto sm:min-w-[110px]"
                onMouseEnter={() => onCursorScaleChange(1.5)}
                onMouseLeave={() => onCursorScaleChange(1.2)}
              >
                {locale === "zh" ? "工作台" : "Studio"}
              </JellyButton>
              <CreepyActionButton
                href={`/watch/${watchVideoId}?lang=${locale}`}
                intensity="subtle"
                className="pointer-events-auto inline-flex h-[3.4rem] w-full min-w-0 max-w-full items-center justify-center gap-2 text-sm sm:h-auto sm:min-w-[11em]"
                onMouseEnter={() => onCursorScaleChange(1.6)}
                onMouseLeave={() => onCursorScaleChange(1.2)}
              >
                <span>Watch</span>
              </CreepyActionButton>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
