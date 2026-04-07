import { TRACKING_EVENTS } from "@/lib/constants";
import { klingProvider } from "@/lib/providers/kling";
import { captureServerEvent } from "@/lib/server/posthog";
import {
  createGeneration,
  findGenerationByProviderJobId,
  getGeneration,
  getTemplateBySlug,
  setGenerationStatus,
} from "@/lib/server/store";
import { absoluteUrl } from "@/lib/utils";
import { type GenerationRequest } from "@/lib/types";

export async function submitGeneration(request: GenerationRequest) {
  const template = await getTemplateBySlug(request.templateSlug);
  if (!template) {
    throw new Error("Template not found");
  }

  const generation = await createGeneration(request);

  try {
    const submitResult = await klingProvider.submit({
      prompt: request.promptOverride,
      duration: "10s",
      aspectRatio: "9:16",
      referenceImageUrl: template.posterUrl || undefined,
      callbackUrl: absoluteUrl("/api/provider/webhook"),
    });

    await setGenerationStatus(generation.id, "generating", {
      providerJobId: submitResult.providerJobId,
    });

    const polled = await klingProvider.getStatus(submitResult.providerJobId);
    if (polled.status === "completed" && polled.outputUrl) {
      const ready = await setGenerationStatus(generation.id, "ready", {
        outputUrl: polled.outputUrl,
        previewUrl: polled.previewUrl ?? polled.outputUrl,
      });
      await captureServerEvent(request.sessionId, TRACKING_EVENTS.generationReady, {
        generationId: generation.id,
        templateSlug: request.templateSlug,
        requestedModel: request.requestedModel,
        executionProvider: "kling",
      });
      return ready;
    }

    if (polled.status === "failed") {
      const failed = await setGenerationStatus(generation.id, "failed", {
        error: polled.error ?? "Provider failed",
      });
      await captureServerEvent(request.sessionId, TRACKING_EVENTS.generationFailed, {
        generationId: generation.id,
        templateSlug: request.templateSlug,
        requestedModel: request.requestedModel,
        executionProvider: "kling",
      });
      return failed;
    }

    await captureServerEvent(request.sessionId, TRACKING_EVENTS.generationSubmit, {
      generationId: generation.id,
      templateSlug: request.templateSlug,
      requestedModel: request.requestedModel,
      executionProvider: "kling",
    });

    return getGeneration(generation.id);
  } catch (error) {
    await setGenerationStatus(generation.id, "failed", {
      error: error instanceof Error ? error.message : "Generation failed",
    });
    throw error;
  }
}

export async function reconcileProviderWebhook(payload: {
  providerJobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  outputUrl?: string;
  previewUrl?: string;
  error?: string;
}) {
  const generation = await findGenerationByProviderJobId(payload.providerJobId);
  if (!generation) return null;

  if (payload.status === "completed" && payload.outputUrl) {
    return setGenerationStatus(generation.id, "ready", {
      outputUrl: payload.outputUrl,
      previewUrl: payload.previewUrl ?? payload.outputUrl,
    });
  }

  if (payload.status === "failed") {
    return setGenerationStatus(generation.id, "failed", {
      error: payload.error ?? "Provider failed",
    });
  }

  return setGenerationStatus(generation.id, "generating");
}
