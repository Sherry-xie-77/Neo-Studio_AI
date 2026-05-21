"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CreepyActionButton } from "@/components/creepy-action-button";
import { LanguageToggle } from "@/components/language-toggle";
import { type Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

const navLinkClass =
  "inline-flex min-h-[44px] items-center justify-center rounded-[1.2rem] px-1.5 text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--avp-text-muted)] transition hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--avp-text)] sm:min-h-[60px] sm:px-3 sm:text-[14px] sm:tracking-[0.06em] lg:min-h-[68px] lg:px-4 lg:text-[17px]";
const activeNavClass =
  "border border-[rgba(178,226,255,0.28)] bg-[rgba(79,153,255,0.18)] text-[var(--avp-text)]";

export function TopNavigation({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  const homeItem = {
    href: `/?lang=${locale}`,
    label: locale === "zh" ? "首页" : "Home",
    active: pathname === "/",
  };

  const discoverItem = {
    href: `/discover?lang=${locale}`,
    label: locale === "zh" ? "发现" : "Discover",
    active: pathname === "/discover",
  };

  const createItem = {
    href: `/create?lang=${locale}`,
    label: locale === "zh" ? "创作" : "Create",
    active: pathname === "/create",
  };

  const signInItem = {
    href: `/auth/login?lang=${locale}`,
    label: locale === "zh" ? "登录" : "Sign In",
    active: pathname === "/auth/login",
  };

  return (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
      <nav className="grid w-full grid-cols-2 gap-1 rounded-[1.5rem] border border-[rgba(165,215,255,0.16)] bg-[rgba(7,17,40,0.62)] p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_42px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:grid-cols-4 sm:gap-2 sm:p-2 sm:rounded-[1.75rem] lg:max-w-[720px]">
        <Link href={homeItem.href} className={cn(navLinkClass, homeItem.active && activeNavClass)}>
          {homeItem.label}
        </Link>

        <CreepyActionButton
          href={discoverItem.href}
          intensity="reveal"
          className={cn(
            "nav-create-btn min-h-[44px] sm:min-h-[60px] lg:min-h-[68px]",
            discoverItem.active && "ring-2 ring-[rgba(178,226,255,0.28)]",
          )}
        >
          <span>{discoverItem.label}</span>
        </CreepyActionButton>

        <Link href={createItem.href} className={cn(navLinkClass, createItem.active && activeNavClass)}>
          {createItem.label}
        </Link>

        <Link href={signInItem.href} className={cn(navLinkClass, signInItem.active && activeNavClass)}>
          {signInItem.label}
        </Link>
      </nav>

      <div className="flex justify-end lg:shrink-0">
        <LanguageToggle locale={locale} />
      </div>
    </div>
  );
}
