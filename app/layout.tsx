import type { Metadata } from "next";
import { type ReactNode } from "react";

import { PostHogProvider } from "@/components/posthog-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Neo-Studio",
  description: "AI video remake workstation powered by Kling image-to-video.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <PostHogProvider />
        {children}
      </body>
    </html>
  );
}
