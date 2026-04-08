import { FeedClient } from "@/components/feed-client";
import { SiteShell } from "@/components/site-shell";
import { TrackView } from "@/components/track-view";
import { TRACKING_EVENTS } from "@/lib/constants";
import { getComments, getFeedVideos } from "@/lib/server/store";

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
  const videos = await getFeedVideos();

  const commentsEntries = await Promise.all(
    videos.map(async (video) => {
      const result = await getComments(video.id);
      return [video.id, result?.comments ?? []] as const;
    }),
  );

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
        initialComments={Object.fromEntries(commentsEntries)}
      />
    </SiteShell>
  );
}
