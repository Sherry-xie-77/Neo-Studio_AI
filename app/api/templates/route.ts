import { NextResponse } from "next/server";

import { getTemplates } from "@/lib/server/store";

export async function GET() {
  const templates = await getTemplates();
  return NextResponse.json({ templates });
}
