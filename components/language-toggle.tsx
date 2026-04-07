"use client";

import Link from "next/link";

import { type Locale } from "@/lib/types";

export function LanguageToggle({ locale }: { locale: Locale }) {
  const nextLocale = locale === "en" ? "zh" : "en";

  return (
    <Link
      href={`?lang=${nextLocale}`}
      className="rounded-full border border-white/12 px-3 py-2 text-xs font-medium uppercase tracking-[0.2em] text-stone-200 transition hover:border-white/30 hover:bg-white/6"
    >
      {nextLocale === "zh" ? "中文" : "EN"}
    </Link>
  );
}
