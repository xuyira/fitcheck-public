import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { serializeOutfit } from "@/lib/serializers";
import { normalizeBackgroundKey, normalizeStickerScale } from "@/lib/backgrounds";

const MAX_DATA_URL_LENGTH = 30_000_000;

function validImage(value: unknown) {
  return typeof value === "string" && value.length <= MAX_DATA_URL_LENGTH && value.startsWith("data:image/");
}

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const outfit = await db.outfit.findFirst({ where: { id, userId: user.id } });
    if (!outfit) return NextResponse.json({ error: "穿搭不存在" }, { status: 404 });
    return NextResponse.json({ outfit: serializeOutfit(outfit) });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const existing = await db.outfit.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "穿搭不存在" }, { status: 404 });
    // Removing an outfit from the wardrobe must not remove calendar snapshots
    // that reference it. Keep the record for those calendar entries and hide it
    // from the wardrobe list instead.
    await db.outfit.update({ where: { id }, data: { savedToWardrobe: false } });
    return NextResponse.json({ ok: true, archived: true });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = await request.json();
    const existing = await db.outfit.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "穿搭不存在" }, { status: 404 });

    const backgroundKey = "backgroundKey" in body ? normalizeBackgroundKey(body.backgroundKey) : existing.backgroundKey;
    const requestedBackground = "backgroundImage" in body ? body.backgroundImage : existing.backgroundImage;
    if (requestedBackground != null && !validImage(requestedBackground)) return NextResponse.json({ error: "背景图片无效或超过20MB" }, { status: 400 });
    const outfit = await db.outfit.update({
      where: { id },
      data: {
        ...(typeof body.finalImage === "string" ? { finalImage: body.finalImage } : {}),
        ...(typeof body.stickerImage === "string" ? { stickerImage: body.stickerImage } : {}),
        ...(typeof body.personImage === "string" ? { personImage: body.personImage } : {}),
        ...(typeof body.garmentImage === "string" ? { garmentImage: body.garmentImage } : {}),
        ...(body.generationStatus === "READY" || body.generationStatus === "GENERATING" ? { generationStatus: body.generationStatus } : {}),
        ...(typeof body.savedToWardrobe === "boolean" ? { savedToWardrobe: body.savedToWardrobe } : {}),
        backgroundKey,
        backgroundImage: backgroundKey === "custom" ? requestedBackground : null,
        stickerScale: "stickerScale" in body ? normalizeStickerScale(body.stickerScale) : existing.stickerScale,
        stickerOffsetX: "stickerOffsetX" in body ? Number(body.stickerOffsetX) || 0 : existing.stickerOffsetX,
        stickerOffsetY: "stickerOffsetY" in body ? Number(body.stickerOffsetY) || 0 : existing.stickerOffsetY,
      },
    });
    return NextResponse.json({ outfit: serializeOutfit(outfit) });
  } catch (error) { return apiError(error); }
}
