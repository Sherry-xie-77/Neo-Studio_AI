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
    en: "Make breakout short-form hits here.",
    zh: "做爆款，在这里完成。",
  },
  body: {
    en: "Move from proven templates to launch-ready short videos in one place, with a faster path to viral-looking results.",
    zh: "从成熟模板到爆款感成片，把选模板、调提示词和启动生成都集中在这里完成。",
  },
} satisfies Record<string, BilingualText>;
