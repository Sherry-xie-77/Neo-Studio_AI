"use client";

import Link from "next/link";
import { LogIn, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { usePremium } from "@/components/premium-provider";
import { type Locale } from "@/lib/types";

export function LoginForm({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refresh } = usePremium();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [message, setMessage] = useState("");
  const next = searchParams.get("next") || `/?lang=${locale}`;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.includes("@")) {
      setStatus("error");
      setMessage(zh ? "请输入有效邮箱" : "Enter a valid email");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const res = await fetch("/api/me", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("login failed");
      await refresh();
      router.push(next);
    } catch {
      setStatus("error");
      setMessage(zh ? "登录失败，请稍后重试" : "Login failed. Please try again.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[30px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.24)]"
    >
      <div className="grid gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(178,226,255,0.28)] bg-[rgba(79,153,255,0.1)] shadow-[0_0_48px_rgba(79,153,255,0.22)]">
          <Mail className="h-6 w-6 text-[#b2e2ff]" />
        </div>

        <label className="grid gap-2 text-sm">
          <span className="text-[var(--avp-text-muted)]">
            {zh ? "邮箱" : "Email"}
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text)] outline-none transition placeholder:text-[var(--avp-text-muted)] focus:border-[var(--avp-border-strong)]"
          />
        </label>

        <button
          type="submit"
          disabled={status === "submitting"}
          className="group relative inline-flex min-h-[52px] items-center justify-center overflow-hidden rounded-full border border-[rgba(178,226,255,0.42)] bg-[linear-gradient(135deg,#f7fbff_0%,#bfe2ff_45%,#8b7dff_100%)] px-5 text-sm font-bold text-[#061a36] shadow-[0_14px_46px_rgba(79,153,255,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="absolute inset-0 translate-x-[-120%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.62),transparent)] transition duration-700 group-hover:translate-x-[120%]" />
          <LogIn className="relative mr-2 h-4 w-4" />
          <span className="relative">
            {status === "submitting" ? (zh ? "登录中..." : "Signing in...") : zh ? "登录并继续观看" : "Sign in and continue"}
          </span>
        </button>

        {message ? <p className="text-sm text-[#ff748f]">{message}</p> : null}

        <Link
          href={`/?lang=${locale}`}
          className="text-sm text-[var(--avp-text-muted)] transition hover:text-[var(--avp-text)]"
        >
          {zh ? "先返回首页浏览" : "Browse home first"}
        </Link>
      </div>
    </form>
  );
}
