import { AdminOrdersClient } from "@/components/admin-orders-client";
import { SiteShell } from "@/components/site-shell";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ lang?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const locale = params.lang === "zh" ? "zh" : "en";
  const zh = locale === "zh";

  return (
    <SiteShell locale={locale}>
      <section className="mx-auto max-w-4xl space-y-6 py-10">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--avp-text-muted)]">
            {zh ? "管理员" : "Admin"}
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[var(--avp-text)]">
            {zh ? "会员订单审核" : "Premium order review"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-[var(--avp-text-muted)]">
            {zh
              ? "用户登记付款后会直接开通正式会员。你可以定期核对 Matrix/Stripe 后台，发现异常订单时在这里驳回。"
              : "Customers get full Premium immediately after registering payment. Review Matrix/Stripe periodically and reject exceptions here."}
          </p>
        </div>

        <AdminOrdersClient locale={locale} />
      </section>
    </SiteShell>
  );
}
