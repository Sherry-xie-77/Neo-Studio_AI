import type { Metadata } from "next";

import { AdminVideosClient } from "@/components/admin-videos-client";
import { SiteShell } from "@/components/site-shell";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminVideosPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const locale = params.lang === "zh" ? "zh" : "en";
  const zh = locale === "zh";

  return (
    <SiteShell locale={locale}>
      <section className="mx-auto max-w-5xl space-y-6 py-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--avp-text-muted)]">
            {zh ? "内部后台" : "Internal Admin"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--avp-text)]">
            {zh ? "作品上传管理" : "Video upload manager"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--avp-text-muted)]">
            {zh
              ? "这个页面不会出现在前台导航里，仅供内部人员使用 ADMIN_TOKEN 上传短剧作品。"
              : "This page is not linked from the public UI. Internal staff can upload short-drama videos with ADMIN_TOKEN."}
          </p>
        </div>

        <AdminVideosClient locale={locale} />
      </section>
    </SiteShell>
  );
}
