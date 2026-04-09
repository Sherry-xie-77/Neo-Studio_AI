import { type BilingualText } from "@/lib/types";

export const feedHeroCopy = {
  title: {
    en: "Browse premium AI shorts, then move into remake mode in one click.",
    zh: "先浏览高级感 AI 短片，再一键进入复刻工作流。",
  },
  body: {
    en: "AI Video Pro combines a cinematic discovery feed with a fast production workspace, so teams can review, select, and regenerate short-form concepts without leaving the browser.",
    zh: "AI Video Pro 把短片发现流和生成工作台合在一个站内，让团队可以在浏览器里直接完成浏览、筛选和再生成。",
  },
} satisfies Record<string, BilingualText>;

export const createPageCopy = {
  title: {
    en: "Control the template, prompt, and output path from one studio surface.",
    zh: "在一个工作台里统一控制模板、提示词和输出路径。",
  },
  body: {
    en: "Select a base template, tune the prompt, and push a new job through the generation pipeline with a cleaner production-style interface.",
    zh: "选择基础模板，调整提示词，再用更接近生产工具的界面把任务送进生成链路。",
  },
} satisfies Record<string, BilingualText>;
