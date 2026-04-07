import Link from "next/link";
import { type ReactNode } from "react";

import { LanguageToggle } from "@/components/language-toggle";
import { type Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SiteShell({
  children,
  locale,
  className,
}: {
  children: ReactNode;
  locale: Locale;
  className?: string;
}) {
  return (
    <div className="min-h-screen bg-[#08070c] text-stone-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(231,145,71,0.12),transparent_36%),radial-gradient(circle_at_top_right,rgba(91,162,255,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_28%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1640px] flex-col px-4 pb-10 pt-5 sm:px-6 lg:px-8">
        <header className="mb-6 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-semibold tracking-[0.24em] text-orange-200">
              NS
            </div>
            <div>
              <div className="text-sm font-semibold tracking-[0.2em] text-stone-50">
                Neo-Studio
              </div>
              <div className="text-xs tracking-[0.18em] text-stone-400">
                AI REMIX VIDEO FEED
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href={`/create?lang=${locale}`}
              className="rounded-full border border-white/12 px-4 py-2 text-sm text-stone-200 transition hover:border-white/30 hover:bg-white/6"
            >
              {locale === "zh" ? "创作" : "Create"}
            </Link>
            <LanguageToggle locale={locale} />
          </div>
        </header>

        <main className={cn("relative flex-1", className)}>{children}</main>
      </div>
    </div>
  );
}
