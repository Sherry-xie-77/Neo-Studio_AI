import { type BilingualText } from "@/lib/types";

export const feedHeroCopy = {
  title: {
    en: "AI videos you can scroll, like, comment, and remake instantly.",
    zh: "像刷抖音和小红书一样刷 AI 视频，然后立刻一键复刻。",
  },
  body: {
    en: "Hover to preview on desktop. Scroll to autoplay on mobile. Tap a card to like, open comments, or jump straight into remake mode.",
    zh: "桌面端悬停预览，移动端滑到视口自动播放。点卡片就能点赞、看评论、直接进入复刻创作。",
  },
} satisfies Record<string, BilingualText>;

export const createPageCopy = {
  title: {
    en: "Remake a video template in one page.",
    zh: "在一个页面里一键复刻视频模板。",
  },
  body: {
    en: "Pick a template, switch models, adjust the main prompt, and submit generation without leaving the page.",
    zh: "选模板、切模型、改主提示词，然后在同一页直接提交生成。",
  },
} satisfies Record<string, BilingualText>;
