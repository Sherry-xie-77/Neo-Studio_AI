"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Clapperboard,
  Play,
  Sparkles,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { captureClientEvent } from "@/lib/client/posthog";
import { CreepyActionButton } from "@/components/creepy-action-button";
import { AVAILABLE_MODELS, TRACKING_EVENTS } from "@/lib/constants";
import { createPageCopy } from "@/lib/site-content";
import { type Locale, type RequestedModel, type VideoTemplate } from "@/lib/types";
import { cn } from "@/lib/utils";

type CreateClientProps = {
  locale: Locale;
  templates: VideoTemplate[];
  initialTemplateSlug?: string;
  fromVideoId?: string;
  initialModel?: RequestedModel;
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
  const [promptState, setPromptState] = useState(() => ({
    templateSlug: resolvedTemplate?.slug ?? "",
    locale,
    value: resolvedTemplate?.defaultPrompt[locale] ?? "",
  }));

  const selectedTemplate =
    templates.find((template) => template.slug === selectedSlug) ?? resolvedTemplate;
  const defaultPrompt = selectedTemplate?.defaultPrompt[locale] ?? "";
  const promptOverride =
    promptState.templateSlug === selectedTemplate?.slug && promptState.locale === locale
      ? promptState.value
      : defaultPrompt;

  useEffect(() => {
    captureClientEvent(TRACKING_EVENTS.createOpen, {
      sessionId,
      templateSlug: resolvedTemplate?.slug,
      fromVideoId,
      locale,
    });
  }, [fromVideoId, locale, resolvedTemplate?.slug, sessionId]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", locale);
    if (selectedSlug) params.set("template", selectedSlug);
    if (selectedModel) params.set("model", selectedModel);
    if (fromVideoId) params.set("from", fromVideoId);

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [fromVideoId, locale, pathname, router, searchParams, selectedModel, selectedSlug]);

  const readyTemplates = useMemo(
    () => templates.filter((template) => template.isReady),
    [templates],
  );
  const promptLength = promptOverride.trim().length;

  function handleExternalGenerate() {
    captureClientEvent(TRACKING_EVENTS.generationSubmit, {
      sessionId,
      templateSlug: selectedTemplate.slug,
      requestedModel: selectedModel,
      promptLength,
      destination: "flowith.io",
    });
  }

  if (!selectedTemplate) return null;

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[36px] border border-[var(--avp-border)] bg-[var(--avp-surface)] shadow-[0_32px_90px_rgba(0,0,0,0.34)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(120,187,255,0.18),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(79,153,255,0.14),transparent_18%),linear-gradient(135deg,rgba(255,255,255,0.03),transparent_44%)]" />
        <div className="relative p-6 sm:p-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--avp-border-strong)] bg-[rgba(79,153,255,0.1)] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-[var(--avp-text-muted)]">
              <Sparkles className="h-3.5 w-3.5" />
              {locale === "zh" ? "CREATE STUDIO" : "CREATE STUDIO"}
            </div>
            <h1 className="mt-5 max-w-4xl text-3xl font-semibold text-[var(--avp-text)] sm:text-4xl">
              {createPageCopy.title[locale]}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--avp-text-muted)] sm:text-base">
              {createPageCopy.body[locale]}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs uppercase tracking-[0.22em] text-[var(--avp-text-muted)]">
              <span className="rounded-full border border-[var(--avp-border)] bg-[rgba(0,26,66,0.28)] px-3 py-2">
                {locale === "zh" ? "模板选择" : "Template select"}
              </span>
              <span className="rounded-full border border-[var(--avp-border)] bg-[rgba(0,26,66,0.28)] px-3 py-2">
                {locale === "zh" ? "提示词微调" : "Prompt tuning"}
              </span>
              <span className="rounded-full border border-[var(--avp-border)] bg-[rgba(0,26,66,0.28)] px-3 py-2">
                {locale === "zh" ? "结果回看" : "Result review"}
              </span>
            </div>
            {fromVideoId ? (
              <div className="mt-5 inline-flex items-center gap-2 rounded-[20px] border border-[rgba(178,226,255,0.24)] bg-[rgba(79,153,255,0.12)] px-4 py-3 text-sm text-[var(--avp-text)]">
                <Play className="h-4 w-4 text-[#9ed1ff]" />
                {locale === "zh"
                  ? "已从信息流带入灵感视频，当前工作台会优先加载对应模板。"
                  : "Loaded from a feed inspiration. The matching template is preselected here."}
              </div>
            ) : null}
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <ModeCard
                href="https://flowith.io/blank"
                icon={<Clapperboard className="h-5 w-5" />}
                title={locale === "zh" ? "一键复刻模块" : "Template Remake"}
                description={
                  locale === "zh"
                    ? "做爆款，从这里一键开始，快速进入高转化短视频创作。"
                    : "Start here to make breakout shorts fast with one-click remake."
                }
              />
              <ModeCard
                href="https://flowith.io/blank"
                icon={<ArrowUpRight className="h-5 w-5" />}
                title={locale === "zh" ? "自由创作模块" : "Free Creation"}
                description={
                  locale === "zh"
                    ? "更多想法，更多空间，把你的创意自由做成完整作品。"
                    : "More ideas, more freedom. Turn your own concepts into finished work."
                }
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_420px]">
        <section className="space-y-6">
          <section className="overflow-hidden rounded-[34px] border border-[var(--avp-border)] bg-[var(--avp-surface)] shadow-[0_28px_70px_rgba(0,0,0,0.28)]">
            <div className="grid xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="relative aspect-[16/10] overflow-hidden bg-[rgba(2,8,20,0.8)] xl:aspect-auto xl:min-h-[460px]">
                <Image
                  src={selectedTemplate.posterUrl}
                  alt={selectedTemplate.title[locale]}
                  fill
                  sizes="(min-width: 1280px) 55vw, 100vw"
                  priority
                  className="absolute inset-0 scale-110 object-cover blur-2xl opacity-65"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,17,38,0.14),transparent_42%,rgba(2,5,13,0.9)_100%)]" />
                <div className="absolute left-5 right-5 top-5 flex flex-wrap gap-2">
                  <StudioChip>{selectedTemplate.trendLabel[locale]}</StudioChip>
                  <StudioChip>{selectedTemplate.collection}</StudioChip>
                  <StudioChip>
                    {locale === "zh"
                      ? `难度 ${selectedTemplate.remixDifficulty}`
                      : `Difficulty ${selectedTemplate.remixDifficulty}`}
                  </StudioChip>
                </div>
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
                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                  <div className="rounded-[26px] border border-[rgba(178,226,255,0.18)] bg-[rgba(2,8,20,0.56)] p-4 backdrop-blur-md">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--avp-text-muted)]">
                      {locale === "zh" ? "当前模板预览" : "Current template preview"}
                    </p>
                    <h2 className="mt-3 text-2xl font-semibold text-[var(--avp-text)]">
                      {selectedTemplate.title[locale]}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--avp-text-muted)]">
                      {selectedTemplate.summary[locale]}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-5 border-t border-[var(--avp-border)] p-5 sm:p-6 xl:border-l xl:border-t-0">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--avp-text-muted)]">
                    {locale === "zh" ? "为什么选它" : "Why this one"}
                  </p>
                  <p className="mt-3 text-base leading-7 text-[var(--avp-text)]">
                    {selectedTemplate.recommendationReason[locale]}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {selectedTemplate.useCases.slice(0, 4).map((useCase) => (
                    <div
                      key={useCase[locale]}
                      className="rounded-[22px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-4"
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#8cc0ff]" />
                        <p className="text-sm leading-6 text-[var(--avp-text)]">{useCase[locale]}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--avp-text-muted)]">
                    {locale === "zh" ? "标签" : "Tags"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedTemplate.tags.map((tag) => (
                      <StudioChip key={tag}>{tag}</StudioChip>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  <MiniMetric
                    label={locale === "zh" ? "执行链路" : "Execution"}
                    value={selectedTemplate.executionProvider.toUpperCase()}
                  />
                  <MiniMetric
                    label={locale === "zh" ? "模板槽位" : "Template slot"}
                    value={selectedTemplate.slug}
                  />
                  <MiniMetric
                    label={locale === "zh" ? "模式" : "Mode"}
                    value={locale === "zh" ? "Remake" : "Remake"}
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.78fr)]">
            <section className="rounded-[32px] border border-[var(--avp-border)] bg-[var(--avp-surface)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--avp-text-muted)]">
                    {locale === "zh" ? "生成控制台" : "Generation controls"}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-[var(--avp-text)]">
                    {locale === "zh" ? "微调后直接提交" : "Tune it, then launch"}
                  </h3>
                </div>
                <div className="rounded-[20px] border border-[var(--avp-border)] bg-[rgba(0,26,66,0.28)] px-4 py-3 text-right">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--avp-text-muted)]">
                    {locale === "zh" ? "当前提示词长度" : "Prompt length"}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[var(--avp-text)]">{promptLength}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {AVAILABLE_MODELS.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setSelectedModel(model.id)}
                    className={cn(
                      "rounded-[24px] border px-4 py-4 text-left transition",
                      selectedModel === model.id
                        ? "border-[var(--avp-border-strong)] bg-[linear-gradient(180deg,rgba(79,153,255,0.18),rgba(14,54,110,0.22))] shadow-[0_14px_28px_rgba(0,73,187,0.16)]"
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

              <label className="mt-5 block space-y-2">
                <span className="text-xs uppercase tracking-[0.22em] text-[var(--avp-text-muted)]">
                  {locale === "zh" ? "主提示词" : "Main prompt"}
                </span>
                <textarea
                  value={promptOverride}
                  onChange={(event) =>
                    setPromptState({
                      templateSlug: selectedTemplate.slug,
                      locale,
                      value: event.target.value,
                    })
                  }
                  className="min-h-52 w-full resize-y rounded-[26px] border border-[var(--avp-border)] bg-[rgba(0,26,66,0.42)] px-4 py-4 text-sm leading-7 text-[var(--avp-text)] outline-none transition placeholder:text-[var(--avp-text-muted)] focus:border-[var(--avp-border-strong)]"
                />
              </label>

              <div className="mt-5 flex flex-wrap items-center gap-4">
                <div className="pb-4">
                  <CreepyActionButton
                    href="https://flowith.io"
                    onClick={handleExternalGenerate}
                    intensity="reveal"
                  >
                    <span>
                      {locale === "zh" ? "前往做爆款" : "Generate now"}
                    </span>
                  </CreepyActionButton>
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[32px] border border-[var(--avp-border)] bg-[var(--avp-surface)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--avp-text-muted)]">
                  {locale === "zh" ? "拆解步骤" : "Breakdown steps"}
                </p>
                <div className="mt-4 grid gap-3">
                  {selectedTemplate.breakdownSteps.slice(0, 3).map((step, index) => (
                    <WorkflowCard
                      key={step[locale]}
                      index={index + 1}
                      title={step[locale]}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] border border-[var(--avp-border)] bg-[var(--avp-surface)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-6">
                <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--avp-text-muted)]">
                  {locale === "zh" ? "快速可改项" : "Quick tweaks"}
                </p>
                <div className="mt-4 grid gap-3">
                  {selectedTemplate.quickTweaks.slice(0, 3).map((tweak) => (
                    <div
                      key={tweak[locale]}
                      className="rounded-[22px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-4"
                    >
                      <div className="flex items-start gap-3">
                        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#8cc0ff]" />
                        <p className="text-sm leading-6 text-[var(--avp-text)]">{tweak[locale]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>

        <aside className="h-fit space-y-4 rounded-[32px] border border-[var(--avp-border)] bg-[var(--avp-surface)] p-4 shadow-[0_24px_64px_rgba(0,0,0,0.24)] backdrop-blur-xl xl:sticky xl:top-24">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--avp-text-muted)]">
                {locale === "zh" ? "模板库" : "Template library"}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-[var(--avp-text)]">
                {locale === "zh" ? "工作台模板槽位" : "Studio template slots"}
              </h2>
            </div>
            <div className="rounded-full border border-[var(--avp-border)] bg-[rgba(79,153,255,0.1)] px-3 py-1 text-xs text-[var(--avp-text-muted)]">
              {readyTemplates.length}
            </div>
          </div>
          <div className="grid gap-3">
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
                  "flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-[22px] border p-3 text-left transition",
                  template.slug === selectedSlug
                    ? "border-[var(--avp-border-strong)] bg-[rgba(79,153,255,0.16)] shadow-[0_16px_30px_rgba(0,73,187,0.16)]"
                    : "border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] hover:border-[var(--avp-border-strong)] hover:bg-[rgba(79,153,255,0.08)]",
                )}
              >
                <div className="relative h-24 w-[54px] shrink-0 overflow-hidden rounded-[16px] border border-[rgba(178,226,255,0.12)] bg-black p-1">
                  {template.posterUrl ? (
                    <Image
                      src={template.posterUrl}
                      alt={template.title[locale]}
                      fill
                      sizes="54px"
                      className="object-contain"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--avp-text-muted)]">
                      EXT
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-[var(--avp-text)]">
                      {template.title[locale]}
                    </p>
                    {template.slug === selectedSlug ? (
                      <span className="h-2.5 w-2.5 rounded-full bg-[#8cc0ff]" />
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--avp-text-muted)]">
                    {template.summary[locale]}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StudioChip small>{template.trendLabel[locale]}</StudioChip>
                    <StudioChip small>{template.remixDifficulty}</StudioChip>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function ModeCard({
  active,
  href,
  icon,
  title,
  description,
}: {
  active?: boolean;
  href?: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  const className = cn(
    "rounded-[28px] border px-5 py-5 text-left transition",
    active
      ? "border-[rgba(178,226,255,0.32)] bg-[linear-gradient(180deg,rgba(130,205,255,0.18),rgba(46,115,214,0.22))] text-[var(--avp-text)] shadow-[0_16px_36px_rgba(0,0,0,0.18)]"
      : "border-[var(--avp-border)] bg-[rgba(255,255,255,0.04)] text-[var(--avp-text-muted)] hover:translate-y-[-2px] hover:text-[var(--avp-text)] hover:shadow-[0_20px_42px_rgba(0,0,0,0.16)]",
  );

  const content = (
    <>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "rounded-[16px] border p-2.5",
            active
              ? "border-[rgba(178,226,255,0.24)] bg-[rgba(255,255,255,0.08)] text-[var(--avp-text)]"
              : "border-[var(--avp-border)] bg-[rgba(0,26,66,0.24)] text-[#8cc0ff]",
          )}
        >
          {icon}
        </div>
      </div>
      <p className="mt-4 text-lg font-semibold">{title}</p>
      <p className="mt-2 text-sm leading-6">{description}</p>
    </>
  );

  if (!href) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link href={href} target="_blank" rel="noreferrer" className={className}>
      {content}
    </Link>
  );
}

function WorkflowCard({ index, title }: { index: number; title: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--avp-border)] bg-[rgba(79,153,255,0.14)] text-xs text-[var(--avp-text)]">
          {index}
        </div>
        <p className="text-sm leading-6 text-[var(--avp-text)]">{title}</p>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--avp-text-muted)]">{label}</p>
      <p className="mt-2 truncate text-sm text-[var(--avp-text)]">{value}</p>
    </div>
  );
}

function StudioChip({
  children,
  small,
}: {
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <span
      className={cn(
        "rounded-full border border-[var(--avp-border)] bg-[rgba(0,26,66,0.46)] text-[var(--avp-text-muted)]",
        small ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-xs",
      )}
    >
      {children}
    </span>
  );
}
