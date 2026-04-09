"use client";

import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useRef,
  useState,
} from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type Coords = {
  x: number;
  y: number;
};

type CreepyActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  href?: string;
  intensity?: "subtle" | "reveal";
};

export function CreepyActionButton({
  children,
  className,
  href,
  intensity = "subtle",
  onMouseMove,
  onMouseLeave,
  ...props
}: CreepyActionButtonProps) {
  const eyesRef = useRef<HTMLSpanElement>(null);
  const [eyeCoords, setEyeCoords] = useState<Coords>({ x: 0, y: 0 });

  const translateX = -50 + eyeCoords.x * 50;
  const translateY = -50 + eyeCoords.y * 50;

  const eyeStyle: CSSProperties = {
    transform: `translate(${translateX}%, ${translateY}%)`,
  };

  const updateEyes = (event: ReactMouseEvent<HTMLElement>) => {
    if (!eyesRef.current) return;

    const eyesRect = eyesRef.current.getBoundingClientRect();
    const eyesCenter: Coords = {
      x: eyesRect.left + eyesRect.width / 2,
      y: eyesRect.top + eyesRect.height / 2,
    };

    const dx = event.clientX - eyesCenter.x;
    const dy = event.clientY - eyesCenter.y;
    const angle = Math.atan2(-dy, dx) + Math.PI / 2;
    const distance = Math.min(Math.hypot(dx, dy), 200);

    setEyeCoords({
      x: (Math.sin(angle) * distance) / 150,
      y: (Math.cos(angle) * distance) / 100,
    });
    onMouseMove?.(event as never);
  };

  const resetEyes = (event: ReactMouseEvent<HTMLElement>) => {
    setEyeCoords({ x: 0, y: 0 });
    onMouseLeave?.(event as never);
  };

  const content = (
    <>
      <span className="creepy-action-btn__eyes" ref={eyesRef}>
        <span className="creepy-action-btn__eye">
          <span className="creepy-action-btn__pupil" style={eyeStyle} />
        </span>
        <span className="creepy-action-btn__eye">
          <span className="creepy-action-btn__pupil" style={eyeStyle} />
        </span>
      </span>
      <span className="creepy-action-btn__cover">{children}</span>
    </>
  );

  const sharedClassName = cn("creepy-action-btn", className);
  const sharedProps = {
    className: sharedClassName,
    onMouseMove: updateEyes,
    onMouseLeave: resetEyes,
  };

  return (
    href ? (
      <Link href={href} {...sharedProps} data-intensity={intensity}>
        {content}
      </Link>
    ) : (
      <button type="button" {...sharedProps} {...props} data-intensity={intensity}>
        {content}
      </button>
    )
  );
}
