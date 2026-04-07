import { type RequestedModel } from "@/lib/types";

export const APP_NAME = "Neo-Studio";
export const APP_TAGLINE = "AI remix video feed";
export const APP_DOMAIN =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const FEED_COLUMNS = {
  desktop: 4,
  tablet: 2,
  mobile: 1,
} as const;

export const AVAILABLE_MODELS: Array<{
  id: RequestedModel;
  label: string;
  sublabel: string;
}> = [
  {
    id: "kling",
    label: "Kling",
    sublabel: "Execution provider",
  },
  {
    id: "veo3",
    label: "Veo 3",
    sublabel: "Beta routed via Kling",
  },
  {
    id: "seedance2",
    label: "Seedance 2.0",
    sublabel: "Beta routed via Kling",
  },
];

export const TRACKING_EVENTS = {
  feedView: "feed_view",
  videoHoverPlay: "video_hover_play",
  videoLike: "video_like",
  commentPanelOpen: "comment_panel_open",
  commentSubmit: "comment_submit",
  createOpen: "create_open",
  templateSwitch: "template_switch",
  generationSubmit: "generation_submit",
  generationReady: "generation_ready",
  generationFailed: "generation_failed",
} as const;
