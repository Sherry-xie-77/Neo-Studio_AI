import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { findLatestOrderByEmail, isEmailPremium } from "@/lib/server/store";

function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export async function GET() {
  const store = await cookies();
  const email = store.get("ns_email")?.value ?? "";
  if (!email) {
    return NextResponse.json({ email: null, hasPremium: false, latestOrder: null });
  }
  const hasPremium = await isEmailPremium(email);
  const latestOrder = await findLatestOrderByEmail(email);
  return NextResponse.json({ email, hasPremium, latestOrder });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const response = NextResponse.json({ email });
  response.cookies.set("ns_email", email, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("ns_email", "", { path: "/", maxAge: 0 });
  return response;
}
