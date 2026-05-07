import { NextResponse } from "next/server";

import { createAgentRevenuePremiumOrder } from "@/lib/server/store";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readAmountMinor(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return Math.round(parsed);
  }
  return undefined;
}

function isPaidStatus(status: string) {
  return ["paid", "succeeded", "complete", "completed", "success"].includes(status.toLowerCase());
}

export async function POST(request: Request) {
  const expectedSecret = process.env.AGENT_REVENUE_WEBHOOK_SECRET;
  if (expectedSecret) {
    const provided = request.headers.get("x-agent-revenue-secret");
    if (provided !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const status = readString(body.status || body.payment_status || body.paymentStatus);
  if (!isPaidStatus(status)) {
    return NextResponse.json({ ignored: true, reason: "payment not completed" });
  }

  const email = readString(
    body.email ||
      body.customer_email ||
      body.customerEmail ||
      (body.customer && typeof body.customer === "object" && "email" in body.customer
        ? (body.customer as { email?: unknown }).email
        : ""),
  );
  const paymentId = readString(body.id || body.payment_id || body.paymentId || body.order_id || body.orderId);
  if (!email.includes("@") || !paymentId) {
    return NextResponse.json({ error: "Missing email or payment id" }, { status: 400 });
  }

  const amountMinor = readAmountMinor(body.amount_minor || body.amountMinor);
  const currency = readString(body.currency).toLowerCase() || undefined;
  const productName = readString(body.product_name || body.productName) || undefined;
  const order = await createAgentRevenuePremiumOrder({
    email,
    paymentId,
    amountMinor,
    currency,
    productName,
  });

  return NextResponse.json({ received: true, order });
}
