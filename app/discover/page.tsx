import { DiscoverClient } from "@/components/discover-client";
import { SiteShell } from "@/components/site-shell";
import { getDiscoverCategories, getDiscoverFeedVideos } from "@/lib/server/store";

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
  const videos = await getDiscoverFeedVideos();
  const categories = await getDiscoverCategories();

  return (
    <SiteShell locale={locale} className="pb-28">
      <DiscoverClient locale={locale} videos={videos} categories={categories} />
    </SiteShell>
  );
}
