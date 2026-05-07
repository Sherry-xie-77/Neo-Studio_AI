import type { Metadata } from "next";
import { Kalam } from "next/font/google";
import { type ReactNode } from "react";

import { PostHogProvider } from "@/components/posthog-provider";
import { PremiumProvider } from "@/components/premium-provider";

import "./globals.css";

const kalam = Kalam({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  variable: "--font-handwriting",
});

export const metadata: Metadata = {
  title: "AI Video Pro",
  description: "AI Video Pro is a blue-black cinematic video studio for browsing and remaking AI shorts.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={kalam.variable}>
        <PostHogProvider />
        <PremiumProvider>{children}</PremiumProvider>
      </body>
    </html>
  );
}
