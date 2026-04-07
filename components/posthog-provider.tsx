"use client";

import { useEffect } from "react";

import { initPosthog } from "@/lib/client/posthog";

export function PostHogProvider() {
  useEffect(() => {
    initPosthog();
  }, []);

  return null;
}
