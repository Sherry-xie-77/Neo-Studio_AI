import { NextResponse } from "next/server";

import { updatePremiumOrderStatus } from "@/lib/server/store";
import type { PremiumOrderStatus } from "@/lib/types";

const ADMIN_HEADER = "x-admin-token";

function isAdmin(request: Request) {
  const token = request.headers.get(ADMIN_HEADER);
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(token && expected && token === expected);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status as PremiumOrderStatus | undefined;
  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  const reviewerNote = typeof body?.reviewerNote === "string" ? body.reviewerNote : undefined;
  const next = await updatePremiumOrderStatus(id, status, reviewerNote);
  if (!next) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ order: next });
}
