import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";
import { serializeCalendarEntry, serializeOutfitSummary } from "@/lib/serializers";
import { normalizeBackgroundKey, normalizeStickerScale } from "@/lib/backgrounds";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DATA_URL_LENGTH = 30_000_000;

function validImage(value: unknown) {
  return typeof value === "string" && value.length <= MAX_DATA_URL_LENGTH && value.startsWith("data:image/");
}

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month") ?? "";
    const entries = await db.calendarEntry.findMany({
      where: { userId: user.id, ...(month ? { date: { startsWith: month } } : {}) },
      include: { outfit: { select: { id: true, source: true, generationStatus: true, backgroundImage: true, backgroundKey: true, stickerScale: true, stickerOffsetX: true, stickerOffsetY: true, createdAt: true } } },
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ entries: entries.map((entry) => ({
      id: entry.id,
      date: entry.date,
      outfit: serializeOutfitSummary(entry.outfit),
      background: entry.backgroundImage,
      backgroundKey: normalizeBackgroundKey(entry.backgroundKey),
      stickerScale: normalizeStickerScale(entry.stickerScale),
      stickerOffsetX: entry.stickerOffsetX,
      stickerOffsetY: entry.stickerOffsetY,
    })) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const outfitId = typeof body.outfitId === "string" ? body.outfitId : "";
    const date = typeof body.date === "string" ? body.date : "";
    if (!DATE_PATTERN.test(date)) return NextResponse.json({ error: "请选择有效日期" }, { status: 400 });
    const outfit = await db.outfit.findFirst({ where: { id: outfitId, userId: user.id } });
    if (!outfit) return NextResponse.json({ error: "穿搭不存在" }, { status: 404 });
    const backgroundKey = normalizeBackgroundKey(body.backgroundKey ?? outfit.backgroundKey);
    const requestedBackground = "backgroundImage" in body ? body.backgroundImage : outfit.backgroundImage;
    if (requestedBackground != null && !validImage(requestedBackground)) return NextResponse.json({ error: "背景图片无效或超过20MB" }, { status: 400 });
    const entry = await db.calendarEntry.upsert({
      where: { userId_date: { userId: user.id, date } },
      update: {
        outfitId,
        backgroundKey,
        backgroundImage: backgroundKey === "custom" ? requestedBackground : null,
        stickerScale: normalizeStickerScale(body.stickerScale ?? outfit.stickerScale),
        stickerOffsetX: Number(body.stickerOffsetX) || 0,
        stickerOffsetY: Number(body.stickerOffsetY) || 0,
      },
      create: {
        userId: user.id,
        outfitId,
        date,
        backgroundKey,
        backgroundImage: backgroundKey === "custom" ? requestedBackground : null,
        stickerScale: normalizeStickerScale(body.stickerScale ?? outfit.stickerScale),
        stickerOffsetX: Number(body.stickerOffsetX) || 0,
        stickerOffsetY: Number(body.stickerOffsetY) || 0,
      },
      include: { outfit: true },
    });
    return NextResponse.json({ entry: serializeCalendarEntry(entry) }, { status: 201 });
  } catch (error) { return apiError(error); }
}
