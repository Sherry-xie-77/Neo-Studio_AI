import { PostHog } from "posthog-node";

import { env, hasPosthog } from "@/lib/server/env";

let client: PostHog | null = null;

function getClient() {
  if (!hasPosthog()) return null;
  if (!client) {
    client = new PostHog(env.posthogKey ?? "", {
      host: env.posthogHost,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return client;
}

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
) {
  const instance = getClient();
  if (!instance) return;

  instance.capture({
    distinctId,
    event,
    properties,
  });

  await instance.shutdown();
  client = null;
}
