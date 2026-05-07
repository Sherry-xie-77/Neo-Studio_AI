import { NextResponse } from "next/server";

import { listPremiumOrders } from "@/lib/server/store";

const ADMIN_HEADER = "x-admin-token";

function isAdmin(request: Request) {
  const token = request.headers.get(ADMIN_HEADER);
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(token && expected && token === expected);
}

export async function GET(request: Request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const orders = await listPremiumOrders(
    status === "approved" || status === "rejected" ? status : undefined,
  );
  return NextResponse.json({ orders });
}
