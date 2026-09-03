import { NextResponse } from "next/server";
import { getBailianTryOn } from "@/lib/bailian-try-on";
import { db } from "@/lib/db";
import { tryOnApiError } from "@/lib/http";
import { remoteImageToDataUrl } from "@/lib/server-images";

export const runtime = "nodejs";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const task = await db.tryOnTask.findUnique({ where: { id } });
    if (!task?.providerTaskId) return NextResponse.json({ error: "试衣任务不存在" }, { status: 404 });
    const data = await getBailianTryOn(task.providerTaskId);
    const providerStatus = String(data.output?.task_status || "UNKNOWN");
    if (providerStatus === "SUCCEEDED") {
      const imageUrl = data.output?.image_url;
      if (!imageUrl) throw new Error("百炼任务完成但没有返回结果图片");
      const image = await remoteImageToDataUrl(imageUrl);
      await db.tryOnTask.update({ where: { id }, data: { status: "SUCCEEDED" } });
      return NextResponse.json({ status: "SUCCEEDED", image });
    }
    if (["FAILED", "UNKNOWN", "CANCELED"].includes(providerStatus)) {
      const message = data.output?.message || "百炼试衣生成失败，请更换照片后重试";
      await db.tryOnTask.update({ where: { id }, data: { status: "FAILED", errorMessage: message } });
      return NextResponse.json({ status: "FAILED", error: message });
    }
    await db.tryOnTask.update({ where: { id }, data: { status: "PROCESSING" } });
    return NextResponse.json({ status: "PROCESSING" });
  } catch (error) { return tryOnApiError(error); }
}
