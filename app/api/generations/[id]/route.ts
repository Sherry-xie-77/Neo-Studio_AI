import { NextResponse } from "next/server";

import { getGeneration } from "@/lib/server/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const generation = await getGeneration(id);
  if (!generation) {
    return NextResponse.json({ error: "Generation not found" }, { status: 404 });
  }

  return NextResponse.json({ generation });
}
