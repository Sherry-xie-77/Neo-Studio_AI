import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

const ADMIN_HEADER = "x-admin-token";
const MAX_VIDEO_BYTES = 5 * 1024 * 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_VIDEO_MB = MAX_VIDEO_BYTES / 1024 / 1024;
const MAX_IMAGE_MB = MAX_IMAGE_BYTES / 1024 / 1024;

function uploadError(error: string, details?: string, status = 400) {
  return NextResponse.json(details ? { error, details } : { error }, { status });
}

function isAdmin(request: Request) {
  const token = request.headers.get(ADMIN_HEADER);
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(token && expected && token === expected);
}

export async function POST(request: Request) {
  if (!isAdmin(request)) {
    return uploadError("后台密钥错误", "请重新输入正确的 ADMIN_TOKEN。Unauthorized.", 401);
  }

  const body = (await request.json().catch(() => null)) as HandleUploadBody | null;
  if (!body) {
    return uploadError("上传请求无效", "浏览器没有正确生成上传请求，请刷新后台后重试。Invalid upload body.");
  }

  try {
    const jsonResponse = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (pathname.startsWith("uploads/videos/")) {
          return {
            allowedContentTypes: ALLOWED_VIDEO_TYPES,
            maximumSizeInBytes: MAX_VIDEO_BYTES,
            addRandomSuffix: false,
          };
        }

        if (pathname.startsWith("uploads/posters/")) {
          return {
            allowedContentTypes: ALLOWED_IMAGE_TYPES,
            maximumSizeInBytes: MAX_IMAGE_BYTES,
            addRandomSuffix: false,
          };
        }

        throw new Error("Unsupported upload path");
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    return uploadError(
      "云端上传初始化失败",
      `视频最大 ${MAX_VIDEO_MB}MB，封面最大 ${MAX_IMAGE_MB}MB；支持 MP4/WebM/OGG 视频和 JPG/PNG/WebP 图片。原始错误：${detail}`,
      400,
    );
  }
}
