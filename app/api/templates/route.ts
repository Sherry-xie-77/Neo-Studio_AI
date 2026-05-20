import { NextResponse } from "next/server";

import { getTemplates } from "@/lib/server/store";

export const revalidate = 30;

export async function GET() {
  const templates = await getTemplates();
  return NextResponse.json(
    { templates },
    {
      headers: {
        "Cache-Control": "s-maxage=30, stale-while-revalidate=120",
      },
    },
  );
}
