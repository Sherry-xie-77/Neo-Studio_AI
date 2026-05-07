"use client";

import Link from "next/link";
import { ExternalLink, Lock, ShieldCheck, Sparkles } from "lucide-react";

import { usePremium } from "@/components/premium-provider";
import { isEpisodeLocked } from "@/lib/paywall";
import { type Locale } from "@/lib/types";

const CHECKOUT_URL =
  "https://buy.stripe.com/14A00k5Vi8c83vP26h9AA02";

export function PremiumWatchGate({
  locale,
  paywallIndex,
  episodeNumber,
  videoUrl,
  posterUrl,
}: {
  locale: Locale;
  paywallIndex: number;
  episodeNumber: number;
  videoUrl: string;
  posterUrl: string;
}) {
  const { hasPremium, email, isLoading } = usePremium();
  const zh = locale === "zh";
  const locked = Boolean(email) && !isLoading && isEpisodeLocked(paywallIndex, hasPremium);

  if (isLoading || !email) {
    return null;
  }

  if (!locked) {
    return videoUrl ? (
      <video
        className="h-full max-h-[80vh] w-auto max-w-full rounded-[28px] bg-black object-contain"
        controls
        playsInline
        poster={posterUrl}
      >
        <source src={videoUrl} type={videoUrl.endsWith(".ogv") ? "video/ogg" : "video/webm"} />
      </video>
    ) : (
      <div className="flex aspect-[9/16] w-full max-w-[420px] items-center justify-center rounded-[28px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-8 text-center text-[var(--avp-text-muted)]">
        {zh ? "这个剧集正在等待真实视频素材接入。" : "This episode is still waiting for the real video asset."}
      </div>
    );
  }

  return (
    <div className="relative flex aspect-[9/16] w-full max-w-[420px] items-center justify-center overflow-hidden rounded-[28px] border border-[var(--avp-border)] bg-black text-center">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-55 blur-sm"
        style={{ backgroundImage: `url(${posterUrl})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(28,79,160,0.28),rgba(0,0,0,0.86))]" />
      <div className="relative z-10 flex max-w-sm flex-col items-center gap-5 p-6">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(178,226,255,0.28)] bg-[rgba(255,255,255,0.08)] shadow-[0_0_48px_rgba(79,153,255,0.38)]">
          <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-[#ffb5c5]" />
          <Lock className="h-8 w-8 text-[#e7f1ff]" />
        </div>
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#b2e2ff]">
            {zh ? "会员专属剧集" : "Premium Episode"}
          </p>
          <h2 className="text-2xl font-semibold text-[var(--avp-text)]">
            {zh ? `解锁第 ${episodeNumber} 集` : `Unlock Episode ${episodeNumber}`}
          </h2>
          <p className="text-sm leading-7 text-[var(--avp-text-muted)]">
            {zh
              ? "前 3 集免费试看，第 4 集起需要会员。2.99 美元一次性解锁 7 天，不自动续费。"
              : "The first 3 episodes are free. Unlock 7 days of Premium for $2.99 one time, no auto-renewal."}
          </p>
        </div>
        <div className="grid w-full gap-3">
          <Link
            href={CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex min-h-[56px] items-center justify-center overflow-hidden rounded-full border border-[rgba(178,226,255,0.42)] bg-[linear-gradient(135deg,#f7fbff_0%,#bfe2ff_45%,#8b7dff_100%)] px-6 text-sm font-bold text-[#061a36] shadow-[0_18px_60px_rgba(79,153,255,0.34)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_80px_rgba(139,125,255,0.42)]"
          >
            <span className="absolute inset-0 translate-x-[-120%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.62),transparent)] transition duration-700 group-hover:translate-x-[120%]" />
            <ShieldCheck className="relative mr-2 h-4 w-4" />
            <span className="relative">{zh ? "立即解锁 · 7 天通行证 $2.99" : "Unlock now · 7-day pass $2.99"}</span>
            <ExternalLink className="relative ml-2 h-4 w-4" />
          </Link>
        </div>
        <p className="text-xs leading-6 text-[var(--avp-text-muted)]">
          {zh
            ? "Matrix 收款确认后会自动开通会员；7 天后自动失效，不会续费。"
            : "Matrix payment confirmation unlocks Premium automatically; it expires after 7 days with no renewal."}
        </p>
      </div>
    </div>
  );
}
