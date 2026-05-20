"use client";

import Link from "next/link";
import { CheckCircle2, Play, Send } from "lucide-react";
import { useState } from "react";

import { usePremium } from "@/components/premium-provider";
import { type Locale } from "@/lib/types";

export function ClaimForm({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const { refresh } = usePremium();
  const [email, setEmail] = useState("");
  const [receipt, setReceipt] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.includes("@") || receipt.trim().length < 4) {
      setStatus("error");
      setMessage(zh ? "请填写有效邮箱和 Stripe 收据/订单编号" : "Enter a valid email and Stripe receipt or order reference");
      return;
    }
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, receipt, note: note || undefined }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "submit failed");
      }
      await refresh();
      setStatus("done");
      setMessage(
        zh
          ? "7 天会员已开通。请用这个邮箱继续观看已解锁剧集。"
          : "Your 7-day Premium pass is active. Use this email to keep watching unlocked episodes.",
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        zh
          ? "提交失败，请稍后重试。"
          : `Submission failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-[28px] border border-[rgba(178,226,255,0.24)] bg-[rgba(79,153,255,0.08)] p-6 shadow-[0_18px_70px_rgba(79,153,255,0.18)]">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-[#b2e2ff]" />
          <h2 className="text-2xl font-semibold text-[var(--avp-text)]">
            {zh ? "会员已解锁" : "Premium unlocked"}
          </h2>
        </div>
        <p className="mt-3 text-sm leading-7 text-[var(--avp-text-muted)]">{message}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/?lang=${locale}`}
            className="inline-flex min-h-[46px] items-center justify-center rounded-full border border-[var(--avp-border)] bg-[rgba(255,255,255,0.04)] px-5 text-sm font-semibold text-[var(--avp-text)] transition hover:border-[rgba(178,226,255,0.34)] hover:bg-[rgba(79,153,255,0.13)]"
          >
            {zh ? "返回首页" : "Back to home"}
          </Link>
          <Link
            href={`/watch/vid_04?lang=${locale}`}
            className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-[linear-gradient(135deg,#f7fbff_0%,#bfe2ff_45%,#8b7dff_100%)] px-5 text-sm font-bold text-[#061a36] shadow-[0_14px_46px_rgba(79,153,255,0.28)] transition hover:-translate-y-0.5"
          >
            <Play className="mr-2 h-4 w-4" />
            {zh ? "继续观看" : "Continue watching"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.18)]"
    >
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm">
          <span className="text-[var(--avp-text-muted)]">
            {zh ? "邮箱（用于开通会员）" : "Email for Premium access"}
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

        <label className="grid gap-2 text-sm">
          <span className="text-[var(--avp-text-muted)]">
            {zh ? "Stripe 收据/订单编号" : "Stripe receipt or order reference"}
          </span>
          <input
            type="text"
            required
            value={receipt}
            onChange={(event) => setReceipt(event.target.value)}
            placeholder="pi_... / ch_... / rcpt_..."
            className="rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text)] outline-none transition placeholder:text-[var(--avp-text-muted)] focus:border-[var(--avp-border-strong)]"
          />
        </label>

        <label className="grid gap-2 text-sm">
          <span className="text-[var(--avp-text-muted)]">
            {zh ? "补充说明（可选）" : "Additional note (optional)"}
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            className="rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text)] outline-none transition focus:border-[var(--avp-border-strong)]"
          />
        </label>

        <button
          type="submit"
          disabled={status === "submitting"}
          className="group relative inline-flex min-h-[50px] items-center justify-center overflow-hidden rounded-full border border-[rgba(178,226,255,0.42)] bg-[linear-gradient(135deg,#f7fbff_0%,#bfe2ff_45%,#8b7dff_100%)] px-5 text-sm font-bold text-[#061a36] shadow-[0_14px_46px_rgba(79,153,255,0.28)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="absolute inset-0 translate-x-[-120%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.62),transparent)] transition duration-700 group-hover:translate-x-[120%]" />
          <Send className="relative mr-2 h-4 w-4" />
          <span className="relative">
            {status === "submitting"
              ? zh
                ? "提交中..."
                : "Submitting..."
              : zh
                ? "提交并开通 7 天会员"
                : "Submit and unlock 7 days"}
          </span>
        </button>

        {status === "error" ? <p className="text-sm text-[#ff748f]">{message}</p> : null}
      </div>
    </form>
  );
}
