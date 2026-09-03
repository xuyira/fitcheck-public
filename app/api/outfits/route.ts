import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { serializeOutfit, serializeOutfitSummary } from "@/lib/serializers";
import { normalizeBackgroundKey, normalizeStickerScale } from "@/lib/backgrounds";

// A 20MB image becomes roughly 28MB after base64 encoding.
const MAX_DATA_URL_LENGTH = 30_000_000;

function validImage(value: unknown) {
  return typeof value === "string"
    && value.length <= MAX_DATA_URL_LENGTH
    && (value.startsWith("data:image/") || value.startsWith("https://images.unsplash.com/"));
}

export async function GET() {
  try {
    const user = await requireUser();
    const outfits = await db.outfit.findMany({
      where: { userId: user.id, savedToWardrobe: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, source: true, generationStatus: true, backgroundImage: true, backgroundKey: true, stickerScale: true, stickerOffsetX: true, stickerOffsetY: true, createdAt: true },
    });
    return NextResponse.json({ outfits: outfits.map(serializeOutfitSummary) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const finalImage = typeof body.finalImage === "string" ? body.finalImage : "";
    if (!validImage(finalImage)) return NextResponse.json({ error: "请选择不超过20MB的图片" }, { status: 400 });
    const source = body.source === "AI_TRY_ON" ? "AI_TRY_ON" : "LOCAL_UPLOAD";
    const stickerImage = validImage(body.stickerImage) ? body.stickerImage : finalImage;
    const backgroundKey = normalizeBackgroundKey(body.backgroundKey);
    const backgroundImage = validImage(body.backgroundImage) ? body.backgroundImage : null;
    const outfit = await db.outfit.create({
      data: {
        userId: user.id,
        source,
        savedToWardrobe: body.saveToWardrobe !== false,
        generationStatus: body.generationStatus === "GENERATING" ? "GENERATING" : "READY",
        finalImage,
        stickerImage,
        personImage: typeof body.personImage === "string" ? body.personImage : null,
        garmentImage: typeof body.garmentImage === "string" ? body.garmentImage : null,
        backgroundImage: backgroundKey === "custom" ? backgroundImage : null,
        backgroundKey,
        stickerScale: normalizeStickerScale(body.stickerScale),
      },
    });
    return NextResponse.json({ outfit: serializeOutfit(outfit) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
