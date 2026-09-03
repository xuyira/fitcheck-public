import type { CalendarEntry, Outfit } from "@prisma/client";
import { normalizeBackgroundKey, normalizeStickerScale } from "@/lib/backgrounds";

export function serializeOutfit(outfit: Outfit) {
  return {
    id: outfit.id,
    source: outfit.source,
    generationStatus: outfit.generationStatus as "GENERATING" | "READY",
    // Older records have no stickerImage yet; continuing to render finalImage
    // keeps them usable until the user creates a new AI try-on.
    image: outfit.stickerImage ?? outfit.finalImage,
    sticker: outfit.stickerImage ?? outfit.finalImage,
    originalImage: outfit.finalImage,
    person: outfit.personImage,
    garment: outfit.garmentImage,
    background: outfit.backgroundImage,
    backgroundKey: normalizeBackgroundKey(outfit.backgroundKey),
    stickerScale: normalizeStickerScale(outfit.stickerScale),
    stickerOffsetX: outfit.stickerOffsetX,
    stickerOffsetY: outfit.stickerOffsetY,
    date: new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Shanghai" }).format(outfit.createdAt),
    createdAt: outfit.createdAt.toISOString(),
  };
}

/**
 * Payload used by wardrobe/calendar grids.  Keep large source images out of
 * list responses; detail pages still use serializeOutfit for the full record.
 */
export function serializeOutfitSummary(outfit: Pick<Outfit, "id" | "source" | "finalImage" | "stickerImage" | "backgroundImage" | "backgroundKey" | "stickerScale" | "stickerOffsetX" | "stickerOffsetY" | "createdAt"> & { generationStatus?: string }) {
  return {
    id: outfit.id,
    source: outfit.source,
    generationStatus: (outfit.generationStatus ?? "READY") as "GENERATING" | "READY",
    image: outfit.stickerImage ?? outfit.finalImage,
    sticker: outfit.stickerImage ?? outfit.finalImage,
    background: outfit.backgroundImage,
    backgroundKey: normalizeBackgroundKey(outfit.backgroundKey),
    stickerScale: normalizeStickerScale(outfit.stickerScale),
    stickerOffsetX: outfit.stickerOffsetX,
    stickerOffsetY: outfit.stickerOffsetY,
    date: new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Shanghai" }).format(outfit.createdAt),
    createdAt: outfit.createdAt.toISOString(),
  };
}

export function serializeCalendarEntry(entry: CalendarEntry & { outfit: Outfit }) {
  return {
    id: entry.id,
    date: entry.date,
    outfit: serializeOutfit(entry.outfit),
    background: entry.backgroundImage,
    backgroundKey: normalizeBackgroundKey(entry.backgroundKey),
    stickerScale: normalizeStickerScale(entry.stickerScale),
    stickerOffsetX: entry.stickerOffsetX,
    stickerOffsetY: entry.stickerOffsetY,
  };
}

export function serializeCalendarDetail(entry: CalendarEntry & { outfit: Pick<Outfit, "id" | "source" | "stickerImage" | "finalImage" | "personImage" | "garmentImage" | "backgroundImage" | "backgroundKey" | "stickerScale" | "stickerOffsetX" | "stickerOffsetY" | "createdAt"> }) {
  const outfit = serializeOutfitSummary(entry.outfit);
  return { id: entry.id, date: entry.date, outfit: { ...outfit, person: entry.outfit.personImage, garment: entry.outfit.garmentImage }, background: entry.backgroundImage, backgroundKey: normalizeBackgroundKey(entry.backgroundKey), stickerScale: normalizeStickerScale(entry.stickerScale), stickerOffsetX: entry.stickerOffsetX, stickerOffsetY: entry.stickerOffsetY };
}
