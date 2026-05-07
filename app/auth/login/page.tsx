import { LoginForm } from "@/components/login-form";
import { SiteShell } from "@/components/site-shell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const locale = params.lang === "zh" ? "zh" : "en";
  const zh = locale === "zh";

  return (
    <SiteShell locale={locale}>
      <section className="mx-auto grid max-w-5xl gap-8 py-10 lg:grid-cols-[1fr_420px] lg:items-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#b2e2ff]">
            {zh ? "登录观看" : "Sign in to watch"}
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-[var(--avp-text)] sm:text-5xl">
            {zh ? "登录后继续观看短剧" : "Sign in to continue watching"}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--avp-text-muted)]">
            {zh
              ? "首页可以自由浏览。进入播放页前需要先用邮箱登录，登录后前 3 集免费试看，第 4 集起按会员付费墙解锁。"
              : "You can browse the feed freely. Sign in with email before watching; the first 3 episodes are free, and Premium unlock applies from episode 4 onward."}
          </p>
        </div>

        <LoginForm locale={locale} />
      </section>
    </SiteShell>
  );
}
