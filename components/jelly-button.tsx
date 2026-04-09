"use client";

import Link from "next/link";
import {
  type ButtonHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

type JellyButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  className?: string;
  href?: string;
  tone?: "primary" | "ghost";
};

export function JellyButton({
  children,
  className,
  href,
  tone = "primary",
  onMouseMove,
  onMouseLeave,
  ...props
}: JellyButtonProps) {
  const hostRef = useRef<HTMLElement | null>(null);
  const [state, setState] = useState({
    x: 50,
    y: 18,
    tiltX: 0,
    tiltY: 0,
  });

  useEffect(() => {
    const handleLeaveWindow = () => {
      setState((current) => ({
        ...current,
        x: 50,
        y: 18,
        tiltX: 0,
        tiltY: 0,
      }));
    };

    window.addEventListener("blur", handleLeaveWindow);
    return () => window.removeEventListener("blur", handleLeaveWindow);
  }, []);

  const updatePointer = (event: ReactMouseEvent<HTMLElement>) => {
    if (!hostRef.current) return;
    const rect = hostRef.current.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width - 0.5;
    const ny = (event.clientY - rect.top) / rect.height - 0.5;

    setState({
      x: (nx + 0.5) * 100,
      y: (ny + 0.5) * 100,
      tiltX: ny * -5,
      tiltY: nx * 7,
    });

    onMouseMove?.(event as never);
  };

  const resetPointer = (event: ReactMouseEvent<HTMLElement>) => {
    setState({
      x: 50,
      y: 18,
      tiltX: 0,
      tiltY: 0,
    });

    onMouseLeave?.(event as never);
  };

  const classes = cn(
    "jelly-btn relative inline-flex items-center justify-center text-sm font-semibold transition duration-300",
    tone === "ghost" ? "jelly-btn--ghost" : "jelly-btn--primary",
    className,
  );

  const sharedProps = {
    ref: (node: HTMLElement | null) => {
      hostRef.current = node;
    },
    className: classes,
    style: {
      transform: `perspective(720px) rotateX(${state.tiltX}deg) rotateY(${state.tiltY}deg)`,
      ["--jb-glare-x" as string]: `${state.x}%`,
      ["--jb-glare-y" as string]: `${state.y}%`,
    },
    onMouseMove: updatePointer,
    onMouseLeave: resetPointer,
  };

  const content = (
    <>
      <span className="jelly-btn__shell" />
      <span className="jelly-btn__shine" />
      <span className="jelly-btn__core" />
      <span className="jelly-btn__label">{children}</span>
    </>
  );

  return href ? (
    <Link href={href} {...sharedProps}>
      {content}
    </Link>
  ) : (
    <button type="button" {...props} {...sharedProps}>
      {content}
    </button>
  );
}
