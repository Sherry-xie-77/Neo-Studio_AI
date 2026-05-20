"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { type Locale } from "@/lib/types";

export function LanguageToggle({ locale }: { locale: Locale }) {
  const nextLocale = locale === "en" ? "zh" : "en";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  params.set("lang", nextLocale);

  return (
    <Link
      href={`${pathname}?${params.toString()}`}
      aria-label={locale === "zh" ? "切换到英文" : "Switch to Chinese"}
      className="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-[var(--avp-border)] bg-[rgba(255,255,255,0.05)] px-2 py-1 text-[11px] font-semibold text-[var(--avp-text)] transition hover:border-[var(--avp-border-strong)] hover:bg-[rgba(79,153,255,0.14)]"
    >
      <span className={locale === "zh" ? "rounded-full bg-[rgba(178,226,255,0.18)] px-2 py-1 text-white" : "px-2 py-1 text-[var(--avp-text-muted)]"}>
        中
      </span>
      <span className={locale === "en" ? "rounded-full bg-[rgba(178,226,255,0.18)] px-2 py-1 text-white" : "px-2 py-1 text-[var(--avp-text-muted)]"}>
        EN
      </span>
    </Link>
  );
}
