import { z } from "zod";

import { requestedModels } from "@/lib/types";

export const generateSchema = z.object({
  sessionId: z.string().min(1),
  templateSlug: z.string().min(1),
  requestedModel: z.enum(requestedModels),
  promptOverride: z.string().trim().min(3),
});

export const commentSchema = z.object({
  sessionId: z.string().min(1),
  nickname: z.string().trim().min(1).max(24),
  body: z.string().trim().min(1).max(280),
});

export const likeSchema = z.object({
  sessionId: z.string().min(1),
});

export const webhookSchema = z.object({
  providerJobId: z.string().min(1),
  status: z.enum(["queued", "processing", "completed", "failed"]),
  outputUrl: z.string().url().optional(),
  previewUrl: z.string().url().optional(),
  error: z.string().optional(),
});
