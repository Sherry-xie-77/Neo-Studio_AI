import { env, hasKling } from "@/lib/server/env";
import { sleep } from "@/lib/utils";

type KlingSubmitInput = {
  prompt: string;
  duration: string;
  aspectRatio: string;
  referenceImageUrl?: string;
  callbackUrl?: string;
};

type KlingSubmitResult = {
  providerJobId: string;
  raw: unknown;
};

type KlingStatusResult = {
  status: "queued" | "processing" | "completed" | "failed";
  outputUrl?: string;
  previewUrl?: string;
  raw: unknown;
  error?: string;
};

function mockOutputUrl(providerJobId: string) {
  const pool = [
    "/media/showcase/miniature-city.webm",
    "/media/showcase/lofi-bedroom.webm",
    "/media/showcase/koi-glass.webm",
    "/media/showcase/origami.webm",
  ];
  const index =
    providerJobId.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    pool.length;
  return pool[index];
}

export const klingProvider = {
  async submit(input: KlingSubmitInput): Promise<KlingSubmitResult> {
    if (!hasKling()) {
      const providerJobId = `mock_kling_${Date.now()}`;
      return {
        providerJobId,
        raw: {
          mode: "mock",
          prompt: input.prompt,
        },
      };
    }

    const response = await fetch(`${env.klingApiBaseUrl}/v1/videos/image2video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.klingApiKey}`,
      },
      body: JSON.stringify({
        prompt: input.prompt,
        duration: input.duration,
        aspect_ratio: input.aspectRatio,
        image_url: input.referenceImageUrl,
        callback_url: input.callbackUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`Kling submit failed: ${response.status}`);
    }

    const raw = (await response.json()) as {
      data?: { id?: string };
      task_id?: string;
    };
    const providerJobId = raw.data?.id ?? raw.task_id;
    if (!providerJobId) {
      throw new Error("Kling submit response missing task id");
    }

    return { providerJobId, raw };
  },

  async getStatus(providerJobId: string): Promise<KlingStatusResult> {
    if (!hasKling()) {
      await sleep(200);
      return {
        status: "completed",
        outputUrl: mockOutputUrl(providerJobId),
        previewUrl: mockOutputUrl(providerJobId),
        raw: { mode: "mock" },
      };
    }

    const response = await fetch(
      `${env.klingApiBaseUrl}/v1/videos/image2video/${providerJobId}`,
      {
        headers: {
          Authorization: `Bearer ${env.klingApiKey}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Kling status failed: ${response.status}`);
    }

    const raw = (await response.json()) as {
      data?: {
        status?: string;
        video_url?: string;
        preview_url?: string;
        error_message?: string;
      };
      status?: string;
      video_url?: string;
      preview_url?: string;
      error_message?: string;
    };

    const statusSource = raw.data?.status ?? raw.status ?? "queued";
    const status =
      statusSource === "succeed" || statusSource === "completed"
        ? "completed"
        : statusSource === "failed"
          ? "failed"
          : statusSource === "processing"
            ? "processing"
            : "queued";

    return {
      status,
      outputUrl: raw.data?.video_url ?? raw.video_url,
      previewUrl: raw.data?.preview_url ?? raw.preview_url,
      error: raw.data?.error_message ?? raw.error_message,
      raw,
    };
  },

  normalizeResult(raw: KlingStatusResult) {
    return {
      status: raw.status,
      outputUrl: raw.outputUrl,
      previewUrl: raw.previewUrl,
      error: raw.error,
    };
  },

  async cancel() {
    return { ok: false };
  },
};
