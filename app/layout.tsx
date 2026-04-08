import type { Metadata } from "next";
import { Cormorant_Garamond, IBM_Plex_Sans, Noto_Sans_SC } from "next/font/google";
import { type ReactNode } from "react";

import { PostHogProvider } from "@/components/posthog-provider";

import "./globals.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-display",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body",
  fallback: ["system-ui", "sans-serif"],
});

const zhFont = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-zh",
  fallback: ["PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "sans-serif"],
});

export const metadata: Metadata = {
  title: "Neo-Studio",
  description: "A cinematic AI video recommendation and remix product powered by Kling.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${displayFont.variable} ${bodyFont.variable} ${zhFont.variable}`}
    >
      <body>
        <PostHogProvider />
        {children}
      </body>
    </html>
  );
}
