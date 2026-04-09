"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type Blob = {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  drift: number;
};

export function LiquidForceField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrame = 0;
    let blobs: Blob[] = [];
    let width = 0;
    let height = 0;
    let time = 0;

    const palette = [
      "rgba(79, 153, 255, 0.20)",
      "rgba(17, 79, 153, 0.22)",
      "rgba(0, 73, 187, 0.18)",
      "rgba(137, 217, 255, 0.16)",
    ];

    const setSize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const count = width < 768 ? 8 : 12;
      blobs = Array.from({ length: count }, (_, index) => ({
        x: width * (0.15 + (index % 4) * 0.22),
        y: height * (0.14 + Math.floor(index / 4) * 0.24),
        ox: width * (0.15 + (index % 4) * 0.22),
        oy: height * (0.14 + Math.floor(index / 4) * 0.24),
        vx: 0,
        vy: 0,
        radius: width < 768 ? 120 + (index % 3) * 24 : 170 + (index % 4) * 34,
        color: palette[index % palette.length],
        drift: Math.random() * Math.PI * 2,
      }));
    };

    const drawBackground = () => {
      const wash = context.createLinearGradient(0, 0, width, height);
      wash.addColorStop(0, "rgba(4, 18, 42, 0.90)");
      wash.addColorStop(0.45, "rgba(4, 11, 27, 0.64)");
      wash.addColorStop(1, "rgba(2, 6, 14, 0.92)");
      context.fillStyle = wash;
      context.fillRect(0, 0, width, height);
    };

    const drawBlob = (blob: Blob) => {
      const gradient = context.createRadialGradient(
        blob.x - blob.radius * 0.18,
        blob.y - blob.radius * 0.22,
        blob.radius * 0.08,
        blob.x,
        blob.y,
        blob.radius,
      );

      gradient.addColorStop(0, "rgba(220, 246, 255, 0.24)");
      gradient.addColorStop(0.18, blob.color);
      gradient.addColorStop(0.65, blob.color.replace(/0\.\d+\)/, "0.08)"));
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

      context.beginPath();
      context.fillStyle = gradient;
      context.filter = "blur(24px)";
      context.ellipse(
        blob.x,
        blob.y,
        blob.radius * 1.08,
        blob.radius * (0.82 + Math.sin(time * 0.0018 + blob.drift) * 0.05),
        Math.sin(time * 0.0007 + blob.drift) * 0.8,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.filter = "none";
    };

    const drawGlassHighlights = () => {
      const gradient = context.createRadialGradient(
        width * 0.52,
        height * 0.28,
        0,
        width * 0.52,
        height * 0.28,
        width * 0.55,
      );
      gradient.addColorStop(0, "rgba(255,255,255,0.08)");
      gradient.addColorStop(0.3, "rgba(110,190,255,0.06)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);
    };

    const animate = () => {
      time += 16;
      drawBackground();

      for (const blob of blobs) {
        const px = pointerRef.current.x;
        const py = pointerRef.current.y;
        const dx = blob.x - px;
        const dy = blob.y - py;
        const distance = Math.hypot(dx, dy) || 1;
        const radius = pointerRef.current.active ? 260 : 180;

        if (distance < radius) {
          const force = (1 - distance / radius) * 1.9;
          blob.vx += (dx / distance) * force;
          blob.vy += (dy / distance) * force;
        }

        blob.vx += (blob.ox + Math.sin(time * 0.00045 + blob.drift) * 28 - blob.x) * 0.012;
        blob.vy += (blob.oy + Math.cos(time * 0.00038 + blob.drift) * 22 - blob.y) * 0.012;
        blob.vx *= 0.94;
        blob.vy *= 0.94;
        blob.x += blob.vx;
        blob.y += blob.vy;

        drawBlob(blob);
      }

      drawGlassHighlights();
      animationFrame = window.requestAnimationFrame(animate);
    };

    const handleMove = (event: MouseEvent) => {
      pointerRef.current = {
        x: event.clientX,
        y: event.clientY,
        active: true,
      };
    };

    const handleLeave = () => {
      pointerRef.current.active = false;
    };

    setSize();
    animate();

    window.addEventListener("resize", setSize);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseout", handleLeave);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", setSize);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseout", handleLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={cn("pointer-events-none fixed inset-0 z-0 opacity-100", className)}
      aria-hidden="true"
    />
  );
}
