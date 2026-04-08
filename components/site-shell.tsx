import Link from "next/link";
import { Sparkles } from "lucide-react";
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
    <div className="min-h-screen text-[var(--text)]" data-locale={locale}>
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1640px] flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <header className="sticky top-3 z-40 mb-8">
          <div className="neo-surface rounded-[1.75rem] px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/?lang=${locale}`} className="mr-2 flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[radial-gradient(circle_at_30%_30%,rgba(247,224,184,0.34),rgba(122,91,42,0.08))] text-sm font-semibold tracking-[0.28em] text-[var(--gold)]">
                  NS
                </div>
                <div className="min-w-0">
                  <div className="neo-display truncate text-xl leading-none text-[var(--text)]">
                    Neo-Studio
                  </div>
                  <div className="truncate text-[11px] uppercase tracking-[0.24em] text-[var(--text-soft)]">
                    {locale === "zh" ? "Explore / Create" : "Explore / Create"}
                  </div>
                </div>
              </Link>

              <nav className="ml-auto hidden items-center gap-2 sm:flex">
                <Link
                  href={`/?lang=${locale}`}
                  className="neo-button-secondary inline-flex items-center px-4 text-sm"
                >
                  {locale === "zh" ? "探索" : "Explore"}
                </Link>
                <Link
                  href={`/create?lang=${locale}`}
                  className="neo-button-secondary inline-flex items-center px-4 text-sm"
                >
                  {locale === "zh" ? "创作" : "Create"}
                </Link>
              </nav>

              <div className="ml-auto flex items-center gap-2">
                <LanguageToggle locale={locale} />
                <Link
                  href={`/create?lang=${locale}`}
                  className="neo-button-primary inline-flex items-center gap-2 px-5 text-sm"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>{locale === "zh" ? "开始创作" : "Start creating"}</span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <main className={cn("relative flex-1", className)}>{children}</main>
      </div>
    </div>
  );
}
