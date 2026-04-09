"use client";

import Link from "next/link";

import { type Locale } from "@/lib/types";

export function LanguageToggle({ locale }: { locale: Locale }) {
  const nextLocale = locale === "en" ? "zh" : "en";

  return (
    <Link
      href={`?lang=${nextLocale}`}
      className="rounded-full border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-2.5 text-[13px] font-medium uppercase tracking-[0.14em] text-[var(--avp-text)] transition hover:border-[var(--avp-border-strong)] hover:bg-[rgba(79,153,255,0.14)]"
    >
      {nextLocale === "zh" ? "中文" : "EN"}
    </Link>
  );
}
