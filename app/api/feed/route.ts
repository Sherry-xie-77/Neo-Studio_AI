import { NextResponse } from "next/server";

import { getFeedVideos } from "@/lib/server/store";

export async function GET() {
  const videos = await getFeedVideos();
  return NextResponse.json({ videos });
}
