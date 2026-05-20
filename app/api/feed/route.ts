import { NextResponse } from "next/server";

import { getFeedVideos } from "@/lib/server/store";

export const revalidate = 30;

export async function GET() {
  const videos = await getFeedVideos();
  return NextResponse.json(
    { videos },
    {
      headers: {
        "Cache-Control": "s-maxage=30, stale-while-revalidate=120",
      },
    },
  );
}
