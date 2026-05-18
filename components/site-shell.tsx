import Link from "next/link";
import { type ReactNode } from "react";

import { LiquidForceField } from "@/components/liquid-force-field";
import { TopNavigation } from "@/components/top-navigation";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
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
    <div className="min-h-screen text-[var(--avp-text)]">
      <LiquidForceField />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,153,255,0.12),transparent_24%),radial-gradient(circle_at_top_right,rgba(0,73,187,0.16),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_18%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1680px] flex-col px-4 pb-10 pt-5 sm:px-7 lg:px-10">
        <header className="mb-8 rounded-[30px] border border-[rgba(165,215,255,0.14)] bg-[rgba(6,18,44,0.66)] px-4 py-4 shadow-[0_22px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:px-6 lg:mb-10 lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:items-center lg:gap-6 lg:px-6 lg:py-5">
          <div className="mb-4 flex items-center justify-between gap-3 lg:mb-0">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-[rgba(178,226,255,0.22)] bg-[linear-gradient(180deg,rgba(79,153,255,0.18),rgba(0,26,66,0.48))] text-xl text-[var(--avp-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_24px_rgba(0,73,187,0.18)] sm:h-14 sm:w-14 sm:text-2xl">
                🎬
              </div>
              <div className="min-w-0">
                <div className="truncate text-[1.4rem] font-semibold leading-none tracking-[0.06em] text-[var(--avp-text)] sm:text-[2.2rem]">
                  {APP_NAME}
                </div>
                <div className="mt-1 text-[10px] tracking-[0.12em] text-[var(--avp-text-muted)] sm:text-xs sm:tracking-[0.18em]">
                  {APP_TAGLINE.toUpperCase()}
                </div>
              </div>
            </Link>
          </div>

          <TopNavigation locale={locale} />
        </header>

        <main className={cn("relative flex-1", className)}>{children}</main>
      </div>
    </div>
  );
}
