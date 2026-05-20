import Link from "next/link";

import { SiteShell } from "@/components/site-shell";
import { type Locale } from "@/lib/types";

const CUSTOM_AD_EMAIL = "orbit-market@agent.flo.ing";
const CUSTOM_DRAMA_PACKAGE = "20 集定制短剧 / $699";

function getLocale(searchParams: { lang?: string }) {
  return searchParams.lang === "zh" ? "zh" : "en";
}

function customAdMailto(locale: Locale) {
  const subject = locale === "zh" ? "已付款：定制 UGC 广告视频需求" : "Paid Order: Custom UGC Ad Video Brief";
  const body = locale === "zh"
    ? [
        "你好，我已完成定制 UGC 广告视频套餐付款。",
        "",
        "付款邮箱：",
        "购买套餐（3条 / 5条 / 10条 / 20集定制短剧 $699）：",
        "产品类型：",
        "投放平台：",
        "想要的视频/短剧风格：",
        "是否已有素材：",
        "产品图片/素材链接：",
        "参考视频链接：",
        "投放目标：",
        "期望交付时间：",
      ].join("\n")
    : [
        "Hi AI Video Pro team,",
        "",
        "I have completed payment for a custom UGC ad video package.",
        "",
        "Payment email:",
        "Package purchased (3 / 5 / 10 videos / $699 custom 20-episode drama):",
        "Product:",
        "Target platform:",
        "Video style:",
        "Existing materials:",
        "Product image / asset links:",
        "Reference videos or drama accounts:",
        "Goal:",
        "Expected delivery time:",
      ].join("\n");

  return `mailto:${CUSTOM_AD_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default async function CustomAdBriefPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const locale = getLocale(params);

  return (
    <SiteShell locale={locale} className="pb-28">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-[32px] border border-[rgba(178,226,255,0.24)] bg-[linear-gradient(135deg,rgba(247,251,255,0.96),rgba(191,226,255,0.88)_46%,rgba(139,125,255,0.78))] p-6 text-[#061a36] shadow-[0_28px_80px_rgba(79,153,255,0.26)] sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.32em] text-[#285084]">
          {locale === "zh" ? "付款成功后提交需求" : "SUBMIT YOUR BRIEF AFTER PAYMENT"}
        </p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
          {locale === "zh" ? "把产品图片和需求发给我们" : "Email your product assets and brief"}
        </h1>
        <p className="mt-3 inline-flex rounded-full border border-[#0d3d7b]/15 bg-white/54 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-[#0d3d7b]">
          {CUSTOM_DRAMA_PACKAGE}
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-[#17345d] sm:text-base">
          {locale === "zh"
            ? "请点击下面按钮打开邮件模板，把付款邮箱、购买套餐、产品图片、参考视频和投放需求补充完整。我们会按邮件内容制作，并把成片交付到你的邮箱。"
            : "Click the button below to open the email template, then fill in your payment email, package purchased, product images, references, and campaign requirements. We’ll produce from your email and deliver the final videos to your inbox."}
        </p>

        <div className="mt-6 rounded-[26px] border border-[#0d3d7b]/15 bg-white/44 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[#285084]">
            {locale === "zh" ? "邮件需要包含" : "INCLUDE IN YOUR EMAIL"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(locale === "zh"
              ? ["付款邮箱", "购买套餐", "产品图片", "投放平台", "短剧风格", "参考账号", "投放目标", "交付时间"]
              : ["Payment email", "Package", "Product images", "Platform", "Drama style", "Reference accounts", "Goal", "Timeline"]
            ).map((item) => (
              <span key={item} className="rounded-full border border-[#0d3d7b]/14 bg-white/52 px-3 py-1.5 text-xs font-semibold text-[#061a36]">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <a href={customAdMailto(locale)} className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#061a36] px-5 text-sm font-bold text-white shadow-[0_18px_42px_rgba(6,26,54,0.22)] transition hover:-translate-y-0.5">
            {locale === "zh" ? "打开邮件模板" : "Open email template"}
          </a>
          <Link href={`/?lang=${locale}#custom-ads`} className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#0d3d7b]/15 bg-white/54 px-5 text-sm font-bold text-[#061a36] transition hover:bg-white/80">
            {locale === "zh" ? "返回首页" : "Back home"}
          </Link>
        </div>
      </section>
    </SiteShell>
  );
}
