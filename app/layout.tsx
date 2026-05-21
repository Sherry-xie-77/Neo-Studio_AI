import type { Metadata } from "next";
import { Kalam } from "next/font/google";
import Script from "next/script";
import { type ReactNode } from "react";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18173500698"
          strategy="afterInteractive"
        />
        <Script id="google-ads-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18173500698');
          `}
        </Script>
        <PostHogProvider />
        <PremiumProvider>{children}</PremiumProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
