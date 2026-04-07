"use client";

import { useEffect } from "react";

import { captureClientEvent } from "@/lib/client/posthog";

export function TrackView({
  event,
  properties,
}: {
  event: string;
  properties?: Record<string, unknown>;
}) {
  useEffect(() => {
    captureClientEvent(event, properties);
  }, [event, properties]);

  return null;
}
