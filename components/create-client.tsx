"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, useTransition } from "react";

import { captureClientEvent } from "@/lib/client/posthog";
import { CreepyActionButton } from "@/components/creepy-action-button";
import { AVAILABLE_MODELS, TRACKING_EVENTS } from "@/lib/constants";
import { type GenerationRecord, type Locale, type RequestedModel, type VideoTemplate } from "@/lib/types";
import { cn } from "@/lib/utils";

type CreateClientProps = {
  locale: Locale;
  templates: VideoTemplate[];
  initialTemplateSlug?: string;
  fromVideoId?: string;
};

const scriptModels = ["Gemini 3.1 Pro", "Claude", "GPT"] as const;
const imageModels = ["nano-banana", "Seedream", "GPT"] as const;
const videoModels = ["Seedance 2.0", "Kling 3.0", "Veo 3.1"] as const;

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
  const [createMode, setCreateMode] = useState<"template" | "free">("template");
  const [selectedScriptModel, setSelectedScriptModel] = useState<(typeof scriptModels)[number]>("Gemini 3.1 Pro");
  const [selectedImageModel, setSelectedImageModel] = useState<(typeof imageModels)[number]>("nano-banana");
  const [selectedVideoModel, setSelectedVideoModel] = useState<(typeof videoModels)[number]>("Seedance 2.0");
  const [scriptDraft, setScriptDraft] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [videoPrompt, setVideoPrompt] = useState("");
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
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setCreateMode("template")}
          className={cn(
            "rounded-[28px] border px-6 py-6 text-left transition",
            createMode === "template"
              ? "border-[rgba(178,226,255,0.36)] bg-[linear-gradient(180deg,rgba(130,205,255,0.18),rgba(46,115,214,0.28))] text-[var(--avp-text)] shadow-[0_16px_36px_rgba(0,0,0,0.18)]"
              : "border-[var(--avp-border)] bg-[rgba(255,255,255,0.04)] text-[var(--avp-text-muted)] hover:text-[var(--avp-text)]",
          )}
        >
          <p className="text-xl font-semibold">
            {locale === "zh" ? "一键复刻模块" : "Template Remake"}
          </p>
          <p className="mt-3 text-sm leading-6">
            {locale === "zh"
              ? "基于现有模板，一键生成同款视频。"
              : "Pick a template and generate a matching remake fast."}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setCreateMode("free")}
          className={cn(
            "rounded-[28px] border px-6 py-6 text-left transition",
            createMode === "free"
              ? "border-[rgba(178,226,255,0.36)] bg-[linear-gradient(180deg,rgba(130,205,255,0.18),rgba(46,115,214,0.28))] text-[var(--avp-text)] shadow-[0_16px_36px_rgba(0,0,0,0.18)]"
              : "border-[var(--avp-border)] bg-[rgba(255,255,255,0.04)] text-[var(--avp-text-muted)] hover:text-[var(--avp-text)]",
          )}
        >
          <p className="text-xl font-semibold">
            {locale === "zh" ? "自由创作模块" : "Free Creation"}
          </p>
          <p className="mt-3 text-sm leading-6">
            {locale === "zh"
              ? "从剧本、图片到视频，独立完成创作流程。"
              : "Build scripts, images, and video outputs from scratch."}
          </p>
        </button>
      </section>

      <section className="rounded-[32px] border border-[var(--avp-border)] bg-[var(--avp-surface)] p-6 shadow-[0_32px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-8">
        <div className="inline-flex rounded-full border border-[var(--avp-border-strong)] bg-[rgba(79,153,255,0.12)] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[var(--avp-text-muted)]">
          {locale === "zh" ? "AI VIDEO PRO STUDIO" : "AI VIDEO PRO STUDIO"}
        </div>
        <h1 className="mt-5 text-3xl font-semibold text-[var(--avp-text)] sm:text-4xl">
          {createMode === "template"
            ? locale === "zh"
              ? "一键复刻模板，快速生成同款视频。"
              : "Remake a template and generate matching video outputs."
            : locale === "zh"
              ? "自由搭建你的剧本、画面和视频生成链路。"
              : "Build your script, imagery, and video pipeline from scratch."}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--avp-text-muted)] sm:text-base">
          {createMode === "template"
            ? locale === "zh"
              ? "Kling、Veo 3、Seedance 2.0 都可以选择。当前版本会记录模型意图，但实际执行仍统一走 Kling 链路。"
              : "Kling, Veo 3, and Seedance 2.0 remain selectable. This version records model intent, while execution is still routed through the Kling pipeline."
            : locale === "zh"
              ? "剧本创作、图片生成、视频生成三段式工作台，支持独立选择模型和输入内容。"
              : "A three-stage workspace for scripts, image generation, and video generation with independent model selection."}
        </p>
      </section>

      <section className="space-y-5">
        {createMode === "free" ? (
          <div className="grid gap-5">
            <FreeCreationPanel
              locale={locale}
              title={locale === "zh" ? "剧本创作" : "Script Writing"}
              models={scriptModels}
              selectedModel={selectedScriptModel}
              onSelectModel={(model) => setSelectedScriptModel(model)}
              value={scriptDraft}
              onChangeValue={setScriptDraft}
              placeholder={
                locale === "zh"
                  ? "输入故事设定、人物关系、冲突和结尾走向..."
                  : "Write your story setup, characters, conflict, and ending direction..."
              }
            />

            <FreeCreationPanel
              locale={locale}
              title={locale === "zh" ? "图片生成" : "Image Generation"}
              models={imageModels}
              selectedModel={selectedImageModel}
              onSelectModel={(model) => setSelectedImageModel(model)}
              value={imagePrompt}
              onChangeValue={setImagePrompt}
              placeholder={
                locale === "zh"
                  ? "输入人物形象、场景氛围、镜头风格、服装道具..."
                  : "Describe characters, scenes, atmosphere, style, wardrobe, and props..."
              }
            />

            <FreeCreationPanel
              locale={locale}
              title={locale === "zh" ? "视频生成" : "Video Generation"}
              models={videoModels}
              selectedModel={selectedVideoModel}
              onSelectModel={(model) => setSelectedVideoModel(model)}
              value={videoPrompt}
              onChangeValue={setVideoPrompt}
              placeholder={
                locale === "zh"
                  ? "输入镜头运动、节奏、时长、动作、转场和输出风格..."
                  : "Describe motion, pacing, duration, action, transitions, and output style..."
              }
            />
          </div>
        ) : null}
      </section>

      {createMode === "template" && selectedTemplate ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_420px]">
          <section className="overflow-hidden rounded-[32px] border border-[var(--avp-border)] bg-[var(--avp-surface)] shadow-[0_28px_70px_rgba(0,0,0,0.28)]">
            <div className="relative aspect-[16/9] overflow-hidden bg-[rgba(2,8,20,0.8)]">
              <Image
                src={selectedTemplate.posterUrl}
                alt={selectedTemplate.title[locale]}
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                priority
                className="absolute inset-0 scale-110 object-cover blur-2xl opacity-65"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#021126]/18 via-transparent to-[#02050d]/88" />
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
                <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-[var(--avp-text-muted)]">
                  {locale === "zh"
                    ? "这个模板还在等团队补充真实视频素材。"
                    : "This template is still waiting on the team to provide the real video asset."}
                </div>
              )}
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-wrap gap-2">
                {selectedTemplate.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[var(--avp-border)] bg-[rgba(0,26,66,0.46)] px-3 py-1 text-xs text-[var(--avp-text-muted)]"
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
                        ? "border-[var(--avp-border-strong)] bg-[rgba(79,153,255,0.18)]"
                        : "border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] hover:border-[var(--avp-border-strong)] hover:bg-[rgba(79,153,255,0.08)]",
                    )}
                  >
                    <p className="text-sm font-semibold text-[var(--avp-text)]">{model.label}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--avp-text-muted)]">
                      {model.sublabel}
                    </p>
                  </button>
                ))}
              </div>

              <label className="space-y-2">
                <span className="text-xs uppercase tracking-[0.22em] text-[var(--avp-text-muted)]">
                  {locale === "zh" ? "主提示词" : "Main prompt"}
                </span>
                <textarea
                  value={promptOverride}
                  onChange={(event) => setPromptOverride(event.target.value)}
                  className="min-h-40 w-full resize-y rounded-[24px] border border-[var(--avp-border)] bg-[rgba(0,26,66,0.42)] px-4 py-4 text-sm leading-7 text-[var(--avp-text)] outline-none transition placeholder:text-[var(--avp-text-muted)] focus:border-[var(--avp-border-strong)]"
                />
              </label>

              <div className="flex flex-wrap items-center gap-4">
                <div className="pb-4">
                  <CreepyActionButton
                    type="button"
                    onClick={() => void submitGeneration()}
                    disabled={isPending || !selectedTemplate.isReady}
                    intensity="reveal"
                    className="disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>
                      {isPending
                        ? locale === "zh"
                          ? "生成中..."
                          : "Generating..."
                        : locale === "zh"
                          ? "一键生成"
                          : "Generate now"}
                    </span>
                  </CreepyActionButton>
                </div>
                <p className="text-sm text-[var(--avp-text-muted)]">
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
                <div className="space-y-3 rounded-[26px] border border-[var(--avp-border)] bg-[rgba(0,26,66,0.38)] p-4">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-[var(--avp-border)] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--avp-text)]">
                      {generation.requestedModel}
                    </span>
                    <span className="rounded-full border border-[var(--avp-border)] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[#8cc0ff]">
                      {generation.executionProvider}
                    </span>
                    <span className="rounded-full border border-[var(--avp-border)] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--avp-text)]">
                      {generation.status}
                    </span>
                  </div>
                  {generation.previewUrl || generation.outputUrl ? (
                    <video
                      className="aspect-[9/16] w-full rounded-[22px] bg-[rgba(2,8,20,0.7)] object-contain"
                      controls
                      playsInline
                    >
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
                  <p className="text-sm text-[var(--avp-text)]">
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
          </section>

          <aside className="space-y-4 rounded-[32px] border border-[var(--avp-border)] bg-[var(--avp-surface)] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.24)] backdrop-blur-xl">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--avp-text-muted)]">
                {locale === "zh" ? "模板库" : "Template library"}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--avp-text)]">
                {locale === "zh" ? "工作台模板槽位" : "Studio template slots"}
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
                      ? "border-[var(--avp-border-strong)] bg-[rgba(79,153,255,0.16)]"
                      : "border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] hover:border-[var(--avp-border-strong)] hover:bg-[rgba(79,153,255,0.08)]",
                  )}
                >
                  <div className="relative h-20 w-14 overflow-hidden rounded-[16px] bg-[rgba(2,8,20,0.7)]">
                    {template.posterUrl ? (
                      <Image
                        src={template.posterUrl}
                        alt={template.title[locale]}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--avp-text-muted)]">
                        EXT
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--avp-text)]">
                      {template.title[locale]}
                    </p>
                    <p className="mt-1 text-xs text-[var(--avp-text-muted)]">
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
      ) : null}
    </div>
  );
}

function FreeCreationPanel<T extends string>({
  locale,
  title,
  models,
  selectedModel,
  onSelectModel,
  value,
  onChangeValue,
  placeholder,
}: {
  locale: Locale;
  title: string;
  models: readonly T[];
  selectedModel: T;
  onSelectModel: (model: T) => void;
  value: string;
  onChangeValue: (value: string) => void;
  placeholder: string;
}) {
  return (
    <section className="rounded-[30px] border border-[var(--avp-border)] bg-[var(--avp-surface)] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.2)] backdrop-blur-xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-[var(--avp-text)]">{title}</h2>
        <div className="flex flex-wrap gap-2">
          {models.map((model) => (
            <button
              key={model}
              type="button"
              onClick={() => onSelectModel(model)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                selectedModel === model
                  ? "bg-white text-[#081838]"
                  : "bg-[rgba(255,255,255,0.05)] text-[var(--avp-text-muted)] hover:text-[var(--avp-text)]",
              )}
            >
              {model}
            </button>
          ))}
        </div>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChangeValue(event.target.value)}
        placeholder={placeholder}
        className="min-h-44 w-full resize-y rounded-[22px] border border-[var(--avp-border)] bg-[rgba(0,26,66,0.42)] px-4 py-4 text-base leading-7 text-[var(--avp-text)] outline-none placeholder:text-[var(--avp-text-muted)]"
      />

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          className="min-w-[128px] rounded-full border border-[rgba(178,226,255,0.24)] bg-[rgba(255,255,255,0.08)] px-5 py-3 text-sm font-semibold text-[var(--avp-text)] shadow-[0_12px_28px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-xl transition hover:bg-[rgba(255,255,255,0.12)]"
        >
          {locale === "zh" ? "添加附件" : "Attach File"}
        </button>
        <button
          type="button"
          className="min-w-[128px] rounded-full border border-[rgba(178,226,255,0.28)] bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.08))] px-5 py-3 text-sm font-semibold text-[var(--avp-text)] shadow-[0_12px_28px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.24)] backdrop-blur-xl transition hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.1))]"
        >
          {locale === "zh" ? "发送" : "Send"}
        </button>
      </div>
    </section>
  );
}
