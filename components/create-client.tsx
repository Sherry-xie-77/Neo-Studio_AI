"use client";

import { RotateCcw, Sparkles, WandSparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { captureClientEvent } from "@/lib/client/posthog";
import { AVAILABLE_MODELS, TRACKING_EVENTS } from "@/lib/constants";
import {
  type GenerationRecord,
  type Locale,
  type PromptFieldKey,
  type RequestedModel,
  type VideoTemplate,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type CreateClientProps = {
  locale: Locale;
  templates: VideoTemplate[];
  initialTemplateSlug?: string;
  fromVideoId?: string;
  initialModel?: RequestedModel;
};

type PromptFieldsState = Record<PromptFieldKey, string>;

const promptLabels: Record<PromptFieldKey, Record<Locale, string>> = {
  subject: { en: "Subject", zh: "主体" },
  setting: { en: "Setting", zh: "场景" },
  motion: { en: "Motion", zh: "动作" },
  camera: { en: "Camera", zh: "镜头" },
  finish: { en: "Finish", zh: "成片质感" },
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

function buildPromptFromFields(fields: PromptFieldsState) {
  return [fields.subject, fields.setting, fields.motion, fields.camera, fields.finish]
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

function deriveFieldState(template: VideoTemplate, locale: Locale): PromptFieldsState {
  return {
    subject: template.promptFields.subject[locale],
    setting: template.promptFields.setting[locale],
    motion: template.promptFields.motion[locale],
    camera: template.promptFields.camera[locale],
    finish: template.promptFields.finish[locale],
  };
}

export function CreateClient({
  locale,
  templates,
  initialTemplateSlug,
  fromVideoId,
  initialModel,
}: CreateClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const resolvedTemplate =
    templates.find((template) => template.slug === initialTemplateSlug && template.isReady) ??
    templates.find((template) => template.isReady) ??
    templates[0];

  const [sessionId] = useState(() =>
    typeof window === "undefined" ? "session_pending" : getSessionId(),
  );
  const [selectedSlug, setSelectedSlug] = useState(resolvedTemplate?.slug ?? "");
  const [selectedModel, setSelectedModel] = useState<RequestedModel>(initialModel ?? "kling");
  const [generation, setGeneration] = useState<GenerationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isPolling, setIsPolling] = useState(false);

  const selectedTemplate =
    templates.find((template) => template.slug === selectedSlug) ?? resolvedTemplate;

  const [promptFields, setPromptFields] = useState<PromptFieldsState>(() =>
    selectedTemplate ? deriveFieldState(selectedTemplate, locale) : {
      subject: "",
      setting: "",
      motion: "",
      camera: "",
      finish: "",
    },
  );

  useEffect(() => {
    captureClientEvent(TRACKING_EVENTS.createOpen, {
      sessionId,
      templateSlug: resolvedTemplate?.slug,
      fromVideoId,
      locale,
    });
  }, [fromVideoId, locale, resolvedTemplate?.slug, sessionId]);

  useEffect(() => {
    if (!selectedTemplate) return;
    setPromptFields(deriveFieldState(selectedTemplate, locale));
  }, [locale, selectedTemplate]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", locale);
    if (selectedSlug) params.set("template", selectedSlug);
    if (selectedModel) params.set("model", selectedModel);
    if (fromVideoId) params.set("from", fromVideoId);

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [fromVideoId, locale, pathname, router, searchParams, selectedModel, selectedSlug]);

  useEffect(() => {
    if (!generation || !["queued", "generating"].includes(generation.status)) return;

    let cancelled = false;
    setIsPolling(true);

    const poll = window.setInterval(async () => {
      const response = await fetch(`/api/generations/${generation.id}`);
      if (!response.ok) return;
      const payload = (await response.json()) as { generation: GenerationRecord };
      if (cancelled) return;

      setGeneration(payload.generation);
      if (!["queued", "generating"].includes(payload.generation.status)) {
        window.clearInterval(poll);
        setIsPolling(false);
      }
    }, 1800);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      setIsPolling(false);
    };
  }, [generation]);

  const readyTemplates = useMemo(
    () => templates.filter((template) => template.isReady),
    [templates],
  );

  const combinedPrompt = useMemo(() => buildPromptFromFields(promptFields), [promptFields]);

  const similarTemplates = useMemo(() => {
    if (!selectedTemplate) return [];
    return readyTemplates
      .filter((template) => template.slug !== selectedTemplate.slug)
      .filter((template) =>
        template.tags.some((tag) => selectedTemplate.tags.includes(tag)),
      )
      .slice(0, 4);
  }, [readyTemplates, selectedTemplate]);

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
          promptOverride: combinedPrompt,
        }),
      });

      await new Promise((resolve) => window.setTimeout(resolve, 280));
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

  function applyQuickTweak(value: string) {
    setPromptFields((current) => ({
      ...current,
      finish: `${current.finish}${current.finish ? "，" : ""}${value}`,
    }));
  }

  function resetPrompt() {
    if (!selectedTemplate) return;
    setPromptFields(deriveFieldState(selectedTemplate, locale));
  }

  if (!selectedTemplate) return null;

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
      <aside className="neo-panel h-fit p-5 sm:p-6 xl:sticky xl:top-28">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[1.75rem] bg-black/40">
          <Image
            src={selectedTemplate.posterUrl}
            alt={selectedTemplate.title[locale]}
            fill
            priority
            sizes="320px"
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
          ) : null}
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-soft)]">
              {locale === "zh" ? "模板概览" : "Template overview"}
            </p>
            <h1 className="neo-display mt-2 text-4xl leading-none">{selectedTemplate.title[locale]}</h1>
            <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
              {selectedTemplate.summary[locale]}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="neo-tag text-[var(--gold)]">{selectedTemplate.trendLabel[locale]}</span>
            <span className="neo-tag">{selectedTemplate.collection}</span>
            <span className="neo-tag">
              {locale === "zh"
                ? selectedTemplate.remixDifficulty === "easy"
                  ? "轻改"
                  : selectedTemplate.remixDifficulty === "medium"
                    ? "中改"
                    : "深改"
                : selectedTemplate.remixDifficulty}
            </span>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">
              {locale === "zh" ? "为什么这个模板有效" : "Why this template works"}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
              {selectedTemplate.recommendationReason[locale]}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">
              {locale === "zh" ? "结构拆解" : "Shot breakdown"}
            </h2>
            <div className="mt-3 grid gap-3">
              {selectedTemplate.breakdownSteps.map((step, index) => (
                <div key={step[locale]} className="neo-card p-4">
                  <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--gold)]">
                    {locale === "zh" ? `步骤 ${index + 1}` : `Step ${index + 1}`}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{step[locale]}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-soft)]">
              {locale === "zh" ? "适用场景" : "Use cases"}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedTemplate.useCases.map((useCase) => (
                <span key={useCase[locale]} className="neo-tag">
                  {useCase[locale]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <section className="neo-panel p-5 sm:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-soft)]">
              {locale === "zh" ? "创作工作台" : "Prompt composer"}
            </p>
            <h2 className="neo-display mt-2 text-4xl leading-none">
              {locale === "zh" ? "把模板改成你的版本" : "Turn the template into your own cut"}
            </h2>
          </div>
          <button
            type="button"
            onClick={resetPrompt}
            className="neo-button-secondary inline-flex items-center gap-2 px-4 text-sm"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{locale === "zh" ? "恢复默认" : "Reset defaults"}</span>
          </button>
        </div>

        <div className="grid gap-4">
          {(Object.keys(promptLabels) as PromptFieldKey[]).map((fieldKey) => (
            <label key={fieldKey} className="space-y-2">
              <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-soft)]">
                {promptLabels[fieldKey][locale]}
              </span>
              <textarea
                value={promptFields[fieldKey]}
                onChange={(event) =>
                  setPromptFields((current) => ({
                    ...current,
                    [fieldKey]: event.target.value,
                  }))
                }
                className="neo-input min-h-28 resize-y"
              />
            </label>
          ))}
        </div>

        <div className="mt-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-soft)]">
            {locale === "zh" ? "快捷改写" : "Quick modifiers"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedTemplate.quickTweaks.map((tweak) => (
              <button
                key={tweak[locale]}
                type="button"
                onClick={() => applyQuickTweak(tweak[locale])}
                className="neo-tag cursor-pointer hover:border-[var(--line-strong)] hover:text-[var(--text)]"
              >
                <Sparkles className="h-3.5 w-3.5 text-[var(--gold)]" />
                {tweak[locale]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 neo-card p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-soft)]">
            {locale === "zh" ? "最终提示词预览" : "Combined prompt preview"}
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{combinedPrompt}</p>
        </div>

        <div className="mt-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-soft)]">
            {locale === "zh" ? "更多模板" : "Template rail"}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {readyTemplates.map((template) => (
              <button
                key={template.slug}
                type="button"
                onClick={() => {
                  setSelectedSlug(template.slug);
                  captureClientEvent(TRACKING_EVENTS.templateSwitch, {
                    sessionId,
                    templateSlug: template.slug,
                  });
                }}
                className={cn(
                  "neo-card flex items-center gap-3 p-3 text-left",
                  template.slug === selectedSlug ? "border-[var(--line-strong)] bg-[var(--gold-soft)]" : "",
                )}
              >
                <div className="relative h-20 w-14 overflow-hidden rounded-[1rem] bg-black/30">
                  <Image
                    src={template.posterUrl}
                    alt={template.title[locale]}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text)]">
                    {template.title[locale]}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-soft)]">
                    {template.trendLabel[locale]}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <aside className="neo-panel h-fit p-5 sm:p-6 xl:sticky xl:top-28">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-soft)]">
            {locale === "zh" ? "生成控制" : "Generation controls"}
          </p>
          <h2 className="neo-display mt-2 text-4xl leading-none">
            {locale === "zh" ? "结果会留在这一页" : "Your output stays in this workspace"}
          </h2>
        </div>

        <div className="mt-5 grid gap-3">
          {AVAILABLE_MODELS.map((model) => (
            <button
              key={model.id}
              type="button"
              aria-pressed={selectedModel === model.id}
              onClick={() => setSelectedModel(model.id)}
              className={cn(
                "neo-card p-4 text-left",
                selectedModel === model.id ? "border-[var(--line-strong)] bg-[var(--gold-soft)]" : "",
              )}
            >
              <p className="text-sm font-semibold text-[var(--text)]">{model.label}</p>
              <p className="mt-1 text-xs leading-6 text-[var(--text-muted)]">{model.sublabel}</p>
            </button>
          ))}
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={() => void submitGeneration()}
            disabled={isPending || !combinedPrompt}
            className="neo-button-primary inline-flex w-full items-center justify-center gap-2 px-5 text-sm font-semibold disabled:opacity-60"
          >
            <WandSparkles className="h-4 w-4" />
            <span>
              {isPending
                ? locale === "zh"
                  ? "Generating…"
                  : "Generating…"
                : locale === "zh"
                  ? "开始生成"
                  : "Generate now"}
            </span>
          </button>
          <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">
            {locale === "zh"
              ? "当前仍统一通过 Kling 执行，但会记录你选择的模型偏好。"
              : "Execution still routes through Kling, but your selected model preference is preserved."}
          </p>
        </div>

        {error ? (
          <div className="mt-5 rounded-[1.2rem] border border-red-400/25 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        <div className="mt-5 neo-card p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-soft)]">
            {locale === "zh" ? "状态时间线" : "Status timeline"}
          </p>
          <div className="mt-4 grid gap-3">
            {["queued", "generating", "ready"].map((status) => {
              const active =
                generation?.status === status ||
                (status === "queued" && !generation) ||
                (status === "ready" && generation?.status === "failed");

              return (
                <div key={status} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "h-2.5 w-2.5 rounded-full border",
                      active
                        ? "border-[var(--line-strong)] bg-[var(--gold)]"
                        : "border-[var(--line)] bg-transparent",
                    )}
                  />
                  <span className="text-sm text-[var(--text-muted)]">
                    {locale === "zh"
                      ? status === "queued"
                        ? "已提交"
                        : status === "generating"
                          ? "生成中"
                          : "结果可用"
                      : status}
                  </span>
                </div>
              );
            })}
          </div>
          {generation?.status === "failed" ? (
            <p className="mt-3 text-sm text-red-200">
              {generation.error ??
                (locale === "zh" ? "生成失败，请稍后再试。" : "Generation failed, please try again.")}
            </p>
          ) : null}
          {isPolling ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              {locale === "zh" ? "正在刷新生成状态…" : "Refreshing generation state…"}
            </p>
          ) : null}
        </div>

        <div className="mt-5 neo-card overflow-hidden p-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-soft)]">
            {locale === "zh" ? "最新结果" : "Latest output"}
          </p>
          {generation?.previewUrl || generation?.outputUrl ? (
            <video className="mt-4 aspect-[9/16] w-full rounded-[1.4rem] bg-black/40 object-contain" controls playsInline>
              <source
                src={generation.previewUrl ?? generation.outputUrl}
                type={
                  (generation.previewUrl ?? generation.outputUrl ?? "").endsWith(".ogv")
                    ? "video/ogg"
                    : "video/webm"
                }
              />
            </video>
          ) : (
            <div className="mt-4 flex aspect-[9/16] items-center justify-center rounded-[1.4rem] border border-[var(--line)] bg-black/20 px-6 text-center text-sm text-[var(--text-soft)]">
              {locale === "zh"
                ? "生成后，结果会留在这里，方便你继续比较和改写。"
                : "Your output will appear here so you can compare and keep iterating."}
            </div>
          )}
          <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
            {generation
              ? generation.status === "ready"
                ? locale === "zh"
                  ? "结果已可预览，你可以继续调 prompt 再来一版。"
                  : "The output is ready. Keep editing the prompt for another pass."
                : generation.status === "failed"
                  ? locale === "zh"
                    ? "这次没有成功，建议保留主体并缩短提示词。"
                    : "This pass failed. Try keeping the subject stable and tightening the prompt."
                  : locale === "zh"
                    ? "任务已提交，当前工作台会自动刷新状态。"
                    : "The job is submitted and this workspace will refresh its status automatically."
              : locale === "zh"
                ? "这里会成为你的结果对照区。"
                : "This becomes your result comparison area."}
          </p>
        </div>

        <div className="mt-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-soft)]">
            {locale === "zh" ? "相似模板" : "Similar templates"}
          </p>
          <div className="mt-3 grid gap-3">
            {similarTemplates.map((template) => (
              <button
                key={template.slug}
                type="button"
                onClick={() => setSelectedSlug(template.slug)}
                className="neo-card flex items-center gap-3 p-3 text-left"
              >
                <div className="relative h-16 w-12 overflow-hidden rounded-[0.9rem] bg-black/30">
                  <Image
                    src={template.posterUrl}
                    alt={template.title[locale]}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--text)]">
                    {template.title[locale]}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-soft)]">
                    {template.summary[locale]}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <Link
            href={`/?lang=${locale}`}
            className="neo-button-secondary mt-4 inline-flex w-full items-center justify-center px-4 text-sm"
          >
            {locale === "zh" ? "回到推荐流继续找灵感" : "Back to the feed for more inspiration"}
          </Link>
        </div>
      </aside>
    </div>
  );
}
