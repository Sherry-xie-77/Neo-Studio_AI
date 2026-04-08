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
      className="neo-button-secondary inline-flex min-w-[3.25rem] items-center justify-center px-3 text-xs font-medium uppercase tracking-[0.2em]"
    >
      {nextLocale === "zh" ? "中文" : "EN"}
    </Link>
  );
}
