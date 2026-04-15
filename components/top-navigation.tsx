"use client";

import { usePathname } from "next/navigation";

import { CreepyActionButton } from "@/components/creepy-action-button";
import { LanguageToggle } from "@/components/language-toggle";
import { MagnificationDock } from "@/components/magnification-dock";
import { type Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TopNavigation({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  const dockItems = [
    {
      href: `/?lang=${locale}`,
      label: locale === "zh" ? "首页" : "Home",
      active: pathname === "/",
    },
    {
      href: `/discover?lang=${locale}`,
      label: "Discover",
      active: pathname === "/discover",
    },
    {
      href: `/auth/login?lang=${locale}`,
      label: locale === "zh" ? "Sign In / Sign Up" : "Sign In / Sign Up",
      active: pathname === "/auth/login",
    },
  ];

  return (
    <div className="relative flex w-full items-center justify-center">
      <div className="hidden items-center justify-center gap-4 lg:flex">
        <MagnificationDock items={dockItems} className="w-full max-w-[620px] justify-center" />
        <CreepyActionButton
          href={`/create?lang=${locale}`}
          intensity="reveal"
          className={cn(
            "nav-create-btn",
            pathname === "/create" ? "ring-2 ring-[rgba(178,226,255,0.22)]" : "",
          )}
        >
          <span>Create</span>
        </CreepyActionButton>
      </div>
      <div className="grid w-full gap-2 lg:hidden">
        <div className="grid grid-cols-2 gap-2">
          <LinkButton href={`/?lang=${locale}`} active={pathname === "/"}>
            {locale === "zh" ? "首页" : "Home"}
          </LinkButton>
          <LinkButton href={`/discover?lang=${locale}`} active={pathname === "/discover"}>
            Discover
          </LinkButton>
        </div>
        <div className="grid grid-cols-[1.15fr_0.85fr] gap-2">
          <CreepyActionButton href={`/create?lang=${locale}`} intensity="reveal" className="nav-create-btn-mobile">
            <span>Create</span>
          </CreepyActionButton>
          <LinkButton href={`/auth/login?lang=${locale}`} active={pathname === "/auth/login"}>
            {locale === "zh" ? "登录/注册" : "Sign In"}
          </LinkButton>
        </div>
      </div>
      <div className="absolute right-0 hidden lg:block">
        <LanguageToggle locale={locale} />
      </div>
    </div>
  );
}

function LinkButton({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={cn(
        "inline-flex min-h-[46px] items-center justify-center rounded-full border px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] transition",
        active
          ? "border-[rgba(178,226,255,0.28)] bg-[rgba(79,153,255,0.18)] text-[var(--avp-text)]"
          : "border-[rgba(171,221,255,0.16)] bg-[rgba(255,255,255,0.04)] text-[var(--avp-text-muted)]",
      )}
    >
      {children}
    </a>
  );
}
