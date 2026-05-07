"use client";

import Link from "next/link";
import { LogIn, Mail } from "lucide-react";

import { usePremium } from "@/components/premium-provider";
import { type Locale } from "@/lib/types";

export function LoginWatchGate({
  locale,
  nextPath,
  posterUrl,
}: {
  locale: Locale;
  nextPath: string;
  posterUrl: string;
}) {
  const { email, isLoading } = usePremium();
  const zh = locale === "zh";

  if (isLoading) {
    return (
      <div className="flex aspect-[9/16] w-full max-w-[420px] items-center justify-center rounded-[28px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-8 text-center text-[var(--avp-text-muted)]">
        {zh ? "正在检查登录状态..." : "Checking sign-in status..."}
      </div>
    );
  }

  if (email) return null;

  return (
    <div className="relative flex aspect-[9/16] w-full max-w-[420px] items-center justify-center overflow-hidden rounded-[28px] border border-[var(--avp-border)] bg-black text-center">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-45 blur-sm"
        style={{ backgroundImage: `url(${posterUrl})` }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(79,153,255,0.24),rgba(0,0,0,0.88))]" />
      <div className="relative z-10 flex max-w-sm flex-col items-center gap-5 p-6">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(178,226,255,0.28)] bg-[rgba(255,255,255,0.08)] shadow-[0_0_48px_rgba(79,153,255,0.34)]">
          <Mail className="h-8 w-8 text-[#e7f1ff]" />
        </div>
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#b2e2ff]">
            {zh ? "登录后观看" : "Sign in required"}
          </p>
          <h2 className="text-2xl font-semibold text-[var(--avp-text)]">
            {zh ? "请先登录" : "Sign in first"}
          </h2>
          <p className="text-sm leading-7 text-[var(--avp-text-muted)]">
            {zh
              ? "登录后可观看免费剧集；第 4 集起再按会员规则解锁。"
              : "Sign in to watch free episodes. Premium unlock starts from episode 4."}
          </p>
        </div>
        <Link
          href={`/auth/login?lang=${locale}&next=${encodeURIComponent(nextPath)}`}
          className="group relative inline-flex min-h-[54px] w-full items-center justify-center overflow-hidden rounded-full border border-[rgba(178,226,255,0.42)] bg-[linear-gradient(135deg,#f7fbff_0%,#bfe2ff_45%,#8b7dff_100%)] px-6 text-sm font-bold text-[#061a36] shadow-[0_18px_60px_rgba(79,153,255,0.34)] transition duration-300 hover:-translate-y-0.5"
        >
          <span className="absolute inset-0 translate-x-[-120%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.62),transparent)] transition duration-700 group-hover:translate-x-[120%]" />
          <LogIn className="relative mr-2 h-4 w-4" />
          <span className="relative">{zh ? "登录并观看" : "Sign in and watch"}</span>
        </Link>
      </div>
    </div>
  );
}
