"use client";

import { CreepyActionButton } from "@/components/creepy-action-button";

type CreateNavButtonProps = {
  href: string;
  label: string;
  active?: boolean;
};

export function CreateNavButton({ href, label, active = false }: CreateNavButtonProps) {
  return (
    <CreepyActionButton
      href={href}
      className="min-w-[148px] px-5 py-2.5 text-sm tracking-[0.16em]"
      data-active={active ? "true" : "false"}
    >
      <span>{label}</span>
    </CreepyActionButton>
  );
}
