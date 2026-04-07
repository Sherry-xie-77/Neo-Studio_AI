"use client";

import posthog from "posthog-js";

let started = false;

export function initPosthog() {
  if (started) return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    capture_pageview: false,
  });
  started = true;
}

export function captureClientEvent(
  event: string,
  properties?: Record<string, unknown>,
) {
  initPosthog();
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return;
  }
  posthog.capture(event, properties);
}
