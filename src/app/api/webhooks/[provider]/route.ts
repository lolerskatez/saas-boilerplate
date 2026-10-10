import { NextResponse } from "next/server";

import { handleWebhookEvent, processors } from "@/lib/billing";
import { logger } from "@/lib/logger";

export async function POST(request: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const processor = processors[provider];
  if (!processor?.isConfigured()) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });

  const body = await request.text();
  let event;
  try {
    event = await processor.parseWebhook(body, request.headers);
  } catch (err) {
    logger.warn({ err, provider }, "Rejected webhook");
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  try {
    const status = await handleWebhookEvent(provider, event);
    logger.info({ provider, eventId: event.id, type: event.type, status }, "Webhook handled");
    return NextResponse.json({ received: true, status });
  } catch (err) {
    logger.error({ err, provider, eventId: event.id }, "Webhook processing failed");
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
