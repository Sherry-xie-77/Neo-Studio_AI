import Link from "next/link";
import { Sparkles } from "lucide-react";
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
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,153,255,0.22),transparent_24%),radial-gradient(circle_at_top_right,rgba(0,73,187,0.26),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_18%)]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1680px] flex-col px-5 pb-10 pt-6 sm:px-7 lg:px-10">
        <header className="mb-10 grid items-center gap-6 rounded-[26px] border border-[rgba(165,215,255,0.14)] bg-[rgba(6,18,44,0.66)] px-6 py-4 shadow-[0_22px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:px-8 lg:grid-cols-[420px_minmax(0,1fr)_112px]">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-[rgba(178,226,255,0.22)] bg-[linear-gradient(180deg,rgba(79,153,255,0.18),rgba(0,26,66,0.48))] text-xl text-[var(--avp-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_10px_24px_rgba(0,73,187,0.18)]">
              🎬
            </div>
            <div>
              <div className="text-[2rem] font-semibold leading-none tracking-[0.08em] text-[var(--avp-text)] sm:text-[2.2rem]">
                {APP_NAME}
              </div>
              <div className="mt-1 text-[11px] tracking-[0.18em] text-[var(--avp-text-muted)] sm:text-xs">
                {APP_TAGLINE.toUpperCase()}
              </div>
            </div>
          </Link>

          <TopNavigation locale={locale} />
          <div className="hidden lg:block" />
        </header>

        <main className={cn("relative flex-1", className)}>{children}</main>
      </div>
    </div>
  );
}
