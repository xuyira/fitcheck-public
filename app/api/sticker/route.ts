import { NextResponse } from "next/server";
import { removeImageBackground } from "@/lib/background-removal";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_DATA_URL_LENGTH = 80_000_000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const image = typeof body.image === "string" ? body.image : "";
    if (!image.startsWith("data:image/") || image.length > MAX_DATA_URL_LENGTH) {
      return NextResponse.json({ error: "试衣结果图片无效或超过20MB" }, { status: 400 });
    }
    const sticker = await removeImageBackground(image);
    return NextResponse.json({ sticker });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "透明贴纸制作失败，请稍后重试" }, { status: 500 });
  }
}
