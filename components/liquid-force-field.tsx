"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type Particle = {
  x: number;
  y: number;
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  pulse: number;
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
    let width = 0;
    let height = 0;
    let time = 0;
    let particles: Particle[] = [];

    const setSize = () => {
      const ratio = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      const spacing = width < 768 ? 18 : 16;
      particles = [];

      for (let y = spacing; y < height; y += spacing) {
        for (let x = spacing; x < width; x += spacing) {
          const centerDistance = Math.hypot(x - width * 0.5, y - height * 0.42);
          const normalized = Math.min(centerDistance / (width * 0.48), 1);
          const visibility = 1 - normalized;
          const jitter = (Math.random() - 0.5) * 1.4;

          particles.push({
            x: x + jitter,
            y: y + jitter,
            ox: x + jitter,
            oy: y + jitter,
            vx: 0,
            vy: 0,
            size: width < 768 ? 1.3 + visibility * 1.5 : 1.2 + visibility * 1.8,
            alpha: 0.22 + visibility * 0.52,
            pulse: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    const drawBackdrop = () => {
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#010307");
      gradient.addColorStop(0.45, "#03101f");
      gradient.addColorStop(1, "#010204");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      const glow = context.createRadialGradient(
        width * 0.5,
        height * 0.42,
        0,
        width * 0.5,
        height * 0.42,
        Math.max(width * 0.34, 280),
      );
      glow.addColorStop(0, "rgba(25, 121, 255, 0.18)");
      glow.addColorStop(0.28, "rgba(16, 83, 188, 0.12)");
      glow.addColorStop(0.7, "rgba(5, 22, 42, 0.04)");
      glow.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
    };

    const drawParticles = () => {
      const pointerRadius = width < 768 ? 120 : 160;

      for (const particle of particles) {
        const dx = particle.x - pointerRef.current.x;
        const dy = particle.y - pointerRef.current.y;
        const distance = Math.hypot(dx, dy) || 1;

        if (pointerRef.current.active && distance < pointerRadius) {
          const force = (1 - distance / pointerRadius) * 0.9;
          particle.vx += (dx / distance) * force;
          particle.vy += (dy / distance) * force;
        }

        particle.vx += (particle.ox - particle.x) * 0.024;
        particle.vy += (particle.oy - particle.y) * 0.024;
        particle.vx *= 0.88;
        particle.vy *= 0.88;
        particle.x += particle.vx;
        particle.y += particle.vy;

        const pulse = 0.82 + Math.sin(time * 0.0015 + particle.pulse) * 0.18;
        const highlight =
          pointerRef.current.active && distance < pointerRadius
            ? 0.32 * (1 - distance / pointerRadius)
            : 0;

        context.beginPath();
        context.fillStyle = `rgba(46, 152, 255, ${particle.alpha * pulse + highlight})`;
        context.arc(
          particle.x,
          particle.y,
          particle.size + highlight * 2.4,
          0,
          Math.PI * 2,
        );
        context.fill();
      }
    };

    const drawFineGrid = () => {
      context.save();
      context.strokeStyle = "rgba(64, 132, 220, 0.03)";
      context.lineWidth = 1;

      for (let x = 0; x <= width; x += 84) {
        context.beginPath();
        context.moveTo(x, 0);
        context.lineTo(x, height);
        context.stroke();
      }

      for (let y = 0; y <= height; y += 84) {
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      context.restore();
    };

    const animate = () => {
      time += 16;
      drawBackdrop();
      drawParticles();
      drawFineGrid();
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
