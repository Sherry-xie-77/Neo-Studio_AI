"use client";

import { WandSparkles } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";

import { captureClientEvent } from "@/lib/client/posthog";
import { AVAILABLE_MODELS, TRACKING_EVENTS } from "@/lib/constants";
import { type GenerationRecord, type Locale, type RequestedModel, type VideoTemplate } from "@/lib/types";
import { cn } from "@/lib/utils";

type CreateClientProps = {
  locale: Locale;
  templates: VideoTemplate[];
  initialTemplateSlug?: string;
  fromVideoId?: string;
};

function getSessionId() {
  if (typeof window === "undefined") return "server";

  const key = "neo-session-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const next = `sess_${crypto.randomUUID()}`;
  window.localStorage.setItem(key, next);
  return next;
}

export function CreateClient({
  locale,
  templates,
  initialTemplateSlug,
  fromVideoId,
}: CreateClientProps) {
  const resolvedTemplate =
    templates.find((template) => template.slug === initialTemplateSlug && template.isReady) ??
    templates.find((template) => template.isReady) ??
    templates[0];

  const [sessionId] = useState(() =>
    typeof window === "undefined" ? "session_pending" : getSessionId(),
  );
  const [selectedSlug, setSelectedSlug] = useState(resolvedTemplate?.slug ?? "");
  const [selectedModel, setSelectedModel] = useState<RequestedModel>("kling");
  const [promptOverride, setPromptOverride] = useState(
    resolvedTemplate?.defaultPrompt[locale] ?? "",
  );
  const [generation, setGeneration] = useState<GenerationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    captureClientEvent(TRACKING_EVENTS.createOpen, {
      sessionId,
      templateSlug: resolvedTemplate?.slug,
      fromVideoId,
      locale,
    });
  }, [fromVideoId, locale, resolvedTemplate?.slug, sessionId]);

  const selectedTemplate =
    templates.find((template) => template.slug === selectedSlug) ?? resolvedTemplate;

  const readyTemplates = useMemo(
    () => templates.filter((template) => template.isReady),
    [templates],
  );

  async function submitGeneration() {
    if (!selectedTemplate) return;
    setError(null);

    startTransition(async () => {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          templateSlug: selectedTemplate.slug,
          requestedModel: selectedModel,
          promptOverride,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        generation?: GenerationRecord;
      };

      if (!response.ok || !payload.generation) {
        setError(
          payload.error ??
            (locale === "zh" ? "生成提交失败，请稍后再试。" : "Generation failed to submit."),
        );
        return;
      }

      setGeneration(payload.generation);
      captureClientEvent(TRACKING_EVENTS.generationSubmit, {
        sessionId,
        templateSlug: selectedTemplate.slug,
        requestedModel: selectedModel,
      });
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_420px]">
      <section className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-stone-50 sm:text-3xl">
            {locale === "zh"
              ? "一键复刻模板，然后只改一句主提示词。"
              : "Remake a template, then just rewrite one main prompt."}
          </h1>
          <p className="text-sm leading-7 text-stone-400 sm:text-base">
            {locale === "zh"
              ? "Kling、Veo 3、Seedance 2.0 都能选，但第一版实际都走 Kling 执行链路。"
              : "Kling, Veo 3, and Seedance 2.0 are all selectable, but this beta routes execution through Kling for now."}
          </p>
        </div>

        {selectedTemplate ? (
          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04]">
            <div className="relative aspect-[16/9] overflow-hidden bg-black/40">
              <Image
                src={selectedTemplate.posterUrl}
                alt={selectedTemplate.title[locale]}
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                priority
                className="absolute inset-0 scale-110 object-cover blur-2xl opacity-65"
              />
              {selectedTemplate.previewVideoUrl ? (
                <video
                  className="absolute inset-0 h-full w-full object-contain"
                  controls
                  muted
                  loop
                  playsInline
                >
                  <source
                    src={selectedTemplate.previewVideoUrl}
                    type={
                      selectedTemplate.previewVideoUrl.endsWith(".ogv")
                        ? "video/ogg"
                        : "video/webm"
                    }
                  />
                </video>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-stone-300">
                  {locale === "zh"
                    ? "这个模板还在等团队补充真实视频素材。"
                    : "This template is still waiting on the team to provide the real video asset."}
                </div>
              )}
            </div>
            <div className="space-y-4 p-5">
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-stone-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {AVAILABLE_MODELS.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setSelectedModel(model.id)}
                    className={cn(
                      "rounded-[22px] border px-4 py-4 text-left transition",
                      selectedModel === model.id
                        ? "border-orange-300/60 bg-orange-300/12"
                        : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]",
                    )}
                  >
                    <p className="text-sm font-semibold text-stone-50">{model.label}</p>
                    <p className="mt-1 text-xs leading-5 text-stone-400">{model.sublabel}</p>
                  </button>
                ))}
              </div>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.22em] text-stone-400">
                  {locale === "zh" ? "主提示词" : "Main prompt"}
                </span>
                <textarea
                  value={promptOverride}
                  onChange={(event) => setPromptOverride(event.target.value)}
                  className="min-h-40 w-full resize-y rounded-[24px] border border-white/12 bg-black/20 px-4 py-4 text-sm leading-7 text-stone-100 outline-none transition placeholder:text-stone-500 focus:border-orange-200/60"
                />
              </label>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => void submitGeneration()}
                  disabled={isPending || !selectedTemplate.isReady}
                  className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <WandSparkles className="h-4 w-4" />
                  <span>
                    {isPending
                      ? locale === "zh"
                        ? "生成中..."
                        : "Generating..."
                      : locale === "zh"
                        ? "一键生成"
                        : "Generate"}
                  </span>
                </button>
                <p className="text-sm text-stone-400">
                  {locale === "zh"
                    ? "Beta 路由：三种模型选择都会记录，但实际执行统一走 Kling。"
                    : "Beta routing: model selection is recorded, but execution is currently unified through Kling."}
                </p>
              </div>

              {error ? (
                <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                  {error}
                </p>
              ) : null}

              {generation ? (
                <div className="space-y-3 rounded-[26px] border border-white/10 bg-black/25 p-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-stone-300">
                      {generation.requestedModel}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-orange-200">
                      {generation.executionProvider}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-stone-300">
                      {generation.status}
                    </span>
                  </div>
                  {generation.previewUrl || generation.outputUrl ? (
                    <video className="aspect-[9/16] w-full rounded-[22px] bg-black/40 object-contain" controls playsInline>
                      <source
                        src={generation.previewUrl ?? generation.outputUrl}
                        type={
                          (generation.previewUrl ?? generation.outputUrl ?? "").endsWith(".ogv")
                            ? "video/ogg"
                            : "video/webm"
                        }
                      />
                    </video>
                  ) : null}
                  <p className="text-sm text-stone-300">
                    {generation.status === "ready"
                      ? locale === "zh"
                        ? "生成完成，结果已经留在本页。"
                        : "Generation finished and the result stays on this page."
                      : generation.status === "failed"
                        ? generation.error ??
                          (locale === "zh" ? "生成失败。" : "Generation failed.")
                        : locale === "zh"
                          ? "任务已提交，正在等待结果。"
                          : "The generation is queued and waiting for a result."}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      <aside className="space-y-4 rounded-[32px] border border-white/10 bg-white/[0.03] p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
            {locale === "zh" ? "模板库" : "Template library"}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-stone-50">
            {locale === "zh" ? "30 个模板槽位" : "30 template slots"}
          </h2>
        </div>
        <div className="grid gap-3">
          {readyTemplates.map((template) => (
            <button
              key={template.slug}
              type="button"
              onClick={() => {
                setSelectedSlug(template.slug);
                setPromptOverride(template.defaultPrompt[locale]);
                captureClientEvent(TRACKING_EVENTS.templateSwitch, {
                  sessionId,
                  templateSlug: template.slug,
                });
              }}
              className={cn(
                "flex items-center gap-3 rounded-[22px] border p-3 text-left transition",
                template.slug === selectedSlug
                  ? "border-orange-300/60 bg-orange-300/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.05]",
              )}
            >
              <div className="relative h-20 w-14 overflow-hidden rounded-[16px] bg-black/30">
                {template.posterUrl ? (
                  <Image
                    src={template.posterUrl}
                    alt={template.title[locale]}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-stone-500">
                    EXT
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-stone-50">
                  {template.title[locale]}
                </p>
                <p className="mt-1 text-xs text-stone-400">
                  {template.isReady
                    ? locale === "zh"
                      ? "本地可预览"
                      : "Ready locally"
                    : locale === "zh"
                      ? "等待外部素材"
                      : "Awaiting external asset"}
                </p>
              </div>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
