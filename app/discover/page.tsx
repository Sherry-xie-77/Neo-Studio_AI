import { DiscoverClient } from "@/components/discover-client";
import { SiteShell } from "@/components/site-shell";
import { getFeedVideos } from "@/lib/server/store";

function getLocale(searchParams: { lang?: string }) {
  return searchParams.lang === "zh" ? "zh" : "en";
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const locale = getLocale(params);
  const videos = await getFeedVideos();

  return (
    <SiteShell locale={locale} className="pb-28">
      <DiscoverClient locale={locale} videos={videos} />
    </SiteShell>
  );
}
