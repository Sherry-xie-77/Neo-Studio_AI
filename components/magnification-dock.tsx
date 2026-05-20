"use client";

import Link from "next/link";
import { useState } from "react";

import { cn } from "@/lib/utils";

export type DockItemData = {
  href: string;
  label: string;
  active?: boolean;
};

export function MagnificationDock({
  items,
  className,
}: {
  items: DockItemData[];
  className?: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-full border border-[rgba(165,215,255,0.14)] bg-[rgba(7,17,40,0.5)] px-4 py-3 shadow-[0_18px_42px_rgba(0,0,0,0.2)] backdrop-blur-xl",
        className,
      )}
      onMouseLeave={() => setHoveredIndex(null)}
      role="toolbar"
      aria-label="Primary navigation"
    >
      {items.map((item, index) => {
        const distance = hoveredIndex === null ? 99 : Math.abs(index - hoveredIndex);
        const scale = distance === 0 ? 1.08 : distance === 1 ? 1.03 : 1;
        const lift = distance === 0 ? -2 : 0;

        return (
          <div
            key={item.href}
            className="relative flex items-end justify-center"
            onMouseEnter={() => setHoveredIndex(index)}
          >
            <div
              className={cn(
                "pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-full border border-[rgba(171,221,255,0.18)] bg-[rgba(9,20,48,0.88)] px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--avp-text)] shadow-[0_10px_20px_rgba(0,0,0,0.2)] transition-all duration-200",
                hoveredIndex === index ? "opacity-100 translate-y-0" : "translate-y-2 opacity-0",
              )}
            >
              {item.label}
            </div>

            <Link
              href={item.href}
              className={cn(
                "relative inline-flex min-w-[124px] items-center justify-center rounded-full border px-6 py-3.5 text-[14px] font-semibold uppercase tracking-[0.1em] transition-[transform,background-color,border-color,color] duration-200",
                item.active
                  ? "border-[rgba(178,226,255,0.28)] bg-[rgba(79,153,255,0.18)] text-[var(--avp-text)]"
                  : "border-[rgba(171,221,255,0.16)] bg-[rgba(255,255,255,0.04)] text-[var(--avp-text-muted)] hover:text-[var(--avp-text)]",
              )}
              style={{
                transform: `translateY(${lift}px) scale(${scale})`,
              }}
            >
              {item.label}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
