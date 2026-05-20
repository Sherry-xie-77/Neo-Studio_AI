import { FeedClient } from "@/components/feed-client";
import { SiteShell } from "@/components/site-shell";
import { TrackView } from "@/components/track-view";
import { TRACKING_EVENTS } from "@/lib/constants";
import { getFeaturedCases, getHomeFeedVideos } from "@/lib/server/store";

export const revalidate = 30;

function getLocale(searchParams: { lang?: string }) {
  return searchParams.lang === "zh" ? "zh" : "en";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; tag?: string; intent?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const locale = getLocale(params);
  const videos = await getHomeFeedVideos();
  const featuredCases = await getFeaturedCases();

  return (
    <SiteShell locale={locale} className="pb-28">
      <TrackView event={TRACKING_EVENTS.feedView} properties={{ locale }} />
      <FeedClient
        locale={locale}
        initialFilters={{
          tag: params.tag,
          intent: params.intent,
          sort: params.sort,
        }}
        initialVideos={videos}
        initialComments={{}}
        featuredCases={featuredCases}
      />
    </SiteShell>
  );
}
