import { NextResponse } from "next/server";

import { toggleLike } from "@/lib/server/store";
import { likeSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = likeSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid like payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await toggleLike(id, parsed.data.sessionId);
  if (!result) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
