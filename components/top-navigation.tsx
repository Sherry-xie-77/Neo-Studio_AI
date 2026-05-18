"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LanguageToggle } from "@/components/language-toggle";
import { type Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TopNavigation({ locale }: { locale: Locale }) {
  const pathname = usePathname();

  const navItems = [
    {
      href: `/?lang=${locale}`,
      label: locale === "zh" ? "首页" : "Home",
      active: pathname === "/",
    },
    {
      href: `/discover?lang=${locale}`,
      label: locale === "zh" ? "发现" : "Discover",
      active: pathname === "/discover",
    },
    {
      href: `/create?lang=${locale}`,
      label: locale === "zh" ? "创作" : "Create",
      active: pathname === "/create",
      featured: true,
    },
    {
      href: `/auth/login?lang=${locale}`,
      label: locale === "zh" ? "登录" : "Sign In",
      active: pathname === "/auth/login",
    },
  ];

  return (
    <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
      <nav className="grid w-full grid-cols-4 gap-2 rounded-[1.75rem] border border-[rgba(165,215,255,0.16)] bg-[rgba(7,17,40,0.62)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_18px_42px_rgba(0,0,0,0.18)] backdrop-blur-xl lg:max-w-[720px]">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex min-h-[58px] items-center justify-center rounded-[1.2rem] px-4 text-[15px] font-semibold uppercase tracking-[0.08em] text-[var(--avp-text-muted)] transition hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--avp-text)] sm:min-h-[68px] sm:text-[17px]",
              item.active &&
                "border border-[rgba(178,226,255,0.28)] bg-[rgba(79,153,255,0.18)] text-[var(--avp-text)]",
              item.featured &&
                "border border-[rgba(178,226,255,0.36)] bg-[linear-gradient(135deg,rgba(178,226,255,0.2),rgba(79,153,255,0.18))] text-[var(--avp-text)] shadow-[0_16px_36px_rgba(79,153,255,0.16)]",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="flex justify-end lg:shrink-0">
        <LanguageToggle locale={locale} />
      </div>
    </div>
  );
}
