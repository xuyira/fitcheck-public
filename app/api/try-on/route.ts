import { NextResponse } from "next/server";
import { createBailianTryOn } from "@/lib/bailian-try-on";
import { db } from "@/lib/db";
import { tryOnApiError } from "@/lib/http";
import { createQwenImageTryOn } from "@/lib/qwen-image-try-on";
import { createOpenAIImageTryOn } from "@/lib/openai-image-try-on";
import { createModelFlareTryOn } from "@/lib/modelflare-image-try-on";
import { remoteImageToDataUrl, uploadTemporaryModelImage } from "@/lib/server-images";

export const runtime = "nodejs";
export const maxDuration = 600;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.person !== "string" || typeof body.garment !== "string") {
      return NextResponse.json({ error: "请先上传人物和服装照片" }, { status: 400 });
    }
    const [personUrl, garmentUrl] = await Promise.all([
      uploadTemporaryModelImage(body.person, "person"),
      uploadTemporaryModelImage(body.garment, "garment"),
    ]);

    const provider = process.env.TRY_ON_PROVIDER || "qwen-image";
    if (provider === "modelflare") {
      const width = Number.isFinite(body.personWidth) ? Number(body.personWidth) : undefined;
      const height = Number.isFinite(body.personHeight) ? Number(body.personHeight) : undefined;
      const resultUrl = await createModelFlareTryOn(personUrl, garmentUrl, width, height);
      const image = await remoteImageToDataUrl(resultUrl);
      return NextResponse.json({ status: "SUCCEEDED", image, provider: "modelflare/gpt-image-2" });
    }
    if (provider === "openai") {
      const resultUrl = await createOpenAIImageTryOn(personUrl, garmentUrl);
      const image = resultUrl.startsWith("data:image/") ? resultUrl : await remoteImageToDataUrl(resultUrl);
      return NextResponse.json({ status: "SUCCEEDED", image, provider: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2" });
    }
    if (provider === "qwen-image") {
      const resultUrl = await createQwenImageTryOn(personUrl, garmentUrl);
      const image = await remoteImageToDataUrl(resultUrl);
      return NextResponse.json({ status: "SUCCEEDED", image, provider: "qwen-image-3.0-pro" });
    }

    const providerTaskId = await createBailianTryOn(personUrl, garmentUrl);
    const task = await db.tryOnTask.create({ data: { provider: "bailian", providerTaskId, status: "PENDING" } });
    return NextResponse.json({ taskId: task.id }, { status: 202 });
  } catch (error) { return tryOnApiError(error); }
}
