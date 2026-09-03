import { NextResponse } from "next/server";

export function apiError(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }
  console.error(error);
  return NextResponse.json({ error: "服务器暂时无法处理请求" }, { status: 500 });
}

export function tryOnApiError(error: unknown) {
  const message = error instanceof Error ? error.message : "试衣服务暂时不可用";
  console.error(error);
  const safeMessage = /API Key|ModelFlare|OpenAI|千问|图片|百炼|OSS|上传|生成|任务|配置|超过|小于|格式|人物|服装|网络|连接|读取|HTTP|超时|耗时/.test(message)
    ? message
    : "试衣服务暂时不可用，请稍后重试";
  return NextResponse.json({ error: safeMessage }, { status: 500 });
}

export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
