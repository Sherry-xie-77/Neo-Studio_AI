import { CreateClient } from "@/components/create-client";
import { SiteShell } from "@/components/site-shell";
import { getTemplates } from "@/lib/server/store";

function getLocale(searchParams: { lang?: string }) {
  return searchParams.lang === "zh" ? "zh" : "en";
}

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; template?: string; from?: string }>;
}) {
  const params = await searchParams;
  const locale = getLocale(params);
  const templates = await getTemplates();

  return (
    <SiteShell locale={locale}>
      <CreateClient
        locale={locale}
        templates={templates}
        initialTemplateSlug={params.template}
        fromVideoId={params.from}
      />
    </SiteShell>
  );
}
