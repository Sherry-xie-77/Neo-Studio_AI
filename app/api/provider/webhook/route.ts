import { NextResponse } from "next/server";

import { env } from "@/lib/server/env";
import { reconcileProviderWebhook } from "@/lib/server/generation";
import { webhookSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const signature = request.headers.get("x-neo-kling-signature");
  if (env.klingWebhookSecret && signature !== env.klingWebhookSecret) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = webhookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid webhook payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await reconcileProviderWebhook(parsed.data);
  return NextResponse.json({ received: true, result });
}
