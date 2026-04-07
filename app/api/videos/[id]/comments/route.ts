import { NextResponse } from "next/server";

import { addComment, getComments } from "@/lib/server/store";
import { commentSchema } from "@/lib/validation";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = await getComments(id);
  if (!result) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await request.json();
  const parsed = commentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid comment payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const comment = await addComment(id, parsed.data);
  if (!comment) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const commentsResult = await getComments(id);
  return NextResponse.json(commentsResult);
}
