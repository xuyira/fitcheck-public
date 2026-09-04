import type { CalendarEntry, Outfit } from "@prisma/client";
import { normalizeBackgroundKey, normalizeStickerScale } from "@/lib/backgrounds";

export function serializeOutfit(outfit: Outfit) {
  const imageVersion = encodeURIComponent(`${outfit.generationStatus}-${outfit.updatedAt.getTime()}`);
  return {
    id: outfit.id,
    source: outfit.source,
    generationStatus: outfit.generationStatus as "GENERATING" | "READY",
    // Older records have no stickerImage yet; continuing to render finalImage
    // keeps them usable until the user creates a new AI try-on.
    image: `/api/outfits/${outfit.id}/image?kind=sticker&v=${imageVersion}`,
    sticker: `/api/outfits/${outfit.id}/image?kind=sticker&v=${imageVersion}`,
    originalImage: `/api/outfits/${outfit.id}/image?kind=original&v=${imageVersion}`,
    person: outfit.personImage ? `/api/outfits/${outfit.id}/image?kind=person&v=${imageVersion}` : null,
    garment: outfit.garmentImage ? `/api/outfits/${outfit.id}/image?kind=garment&v=${imageVersion}` : null,
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
export function serializeOutfitSummary(outfit: Pick<Outfit, "id" | "source" | "backgroundImage" | "backgroundKey" | "stickerScale" | "stickerOffsetX" | "stickerOffsetY" | "createdAt"> & { generationStatus?: string }) {
  const imageVersion = encodeURIComponent(outfit.generationStatus ?? "READY");
  return {
    id: outfit.id,
    source: outfit.source,
    generationStatus: (outfit.generationStatus ?? "READY") as "GENERATING" | "READY",
    image: `/api/outfits/${outfit.id}/image?kind=sticker&v=${imageVersion}`,
    sticker: `/api/outfits/${outfit.id}/image?kind=sticker&v=${imageVersion}`,
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

export function serializeCalendarDetail(entry: CalendarEntry & { outfit: Pick<Outfit, "id" | "source" | "backgroundImage" | "backgroundKey" | "stickerScale" | "stickerOffsetX" | "stickerOffsetY" | "createdAt"> & { generationStatus?: string } }) {
  const outfit = serializeOutfitSummary(entry.outfit);
  const version = encodeURIComponent(`${entry.outfit.generationStatus ?? "READY"}-${entry.outfit.createdAt.getTime()}`);
  outfit.image = `/api/outfits/${entry.outfit.id}/image?kind=sticker&v=${version}`;
  outfit.sticker = outfit.image;
  return { id: entry.id, date: entry.date, outfit: { ...outfit, person: entry.outfit.source === "AI_TRY_ON" ? `/api/outfits/${entry.outfit.id}/image?kind=person` : null, garment: entry.outfit.source === "AI_TRY_ON" ? `/api/outfits/${entry.outfit.id}/image?kind=garment` : null }, background: entry.backgroundImage, backgroundKey: normalizeBackgroundKey(entry.backgroundKey), stickerScale: normalizeStickerScale(entry.stickerScale), stickerOffsetX: entry.stickerOffsetX, stickerOffsetY: entry.stickerOffsetY };
}
