"use client";

import { usePathname } from "next/navigation";

import { CreepyActionButton } from "@/components/creepy-action-button";
import { LanguageToggle } from "@/components/language-toggle";
import { MagnificationDock } from "@/components/magnification-dock";
import { type Locale } from "@/lib/types";

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
          intensity="subtle"
          className={pathname === "/create" ? "ring-2 ring-[rgba(178,226,255,0.22)]" : ""}
        >
          <span>Create</span>
        </CreepyActionButton>
      </div>
      <div className="mx-auto flex items-center justify-center gap-3 lg:hidden">
        <MagnificationDock items={dockItems} className="w-full max-w-[520px] scale-[0.92] justify-center" />
        <CreepyActionButton
          href={`/create?lang=${locale}`}
          intensity="subtle"
          className="scale-[0.9]"
        >
          <span>Create</span>
        </CreepyActionButton>
      </div>
      <div className="absolute right-0">
        <LanguageToggle locale={locale} />
      </div>
    </div>
  );
}
