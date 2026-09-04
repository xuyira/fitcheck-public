import { OutfitDetailPage } from "@/components/wardrobe/outfit-detail-page";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { serializeOutfitSummary } from "@/lib/serializers";

export default async function OutfitPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); const { id } = await params; const outfit = await db.outfit.findFirst({ where: { id, userId: user.id }, select: { id: true, source: true, generationStatus: true, backgroundImage: true, backgroundKey: true, stickerScale: true, stickerOffsetX: true, stickerOffsetY: true, createdAt: true } });
  if (!outfit) return <div className="empty-state"><h2>穿搭不存在</h2></div>;
  const summary = serializeOutfitSummary(outfit);
  const imageVersion = encodeURIComponent(`${outfit.generationStatus}-${outfit.createdAt.getTime()}`);
  const look = { ...summary, originalImage: `/api/outfits/${outfit.id}/image?kind=original&v=${imageVersion}`, person: outfit.source === "AI_TRY_ON" ? `/api/outfits/${outfit.id}/image?kind=person&v=${imageVersion}` : null, garment: outfit.source === "AI_TRY_ON" ? `/api/outfits/${outfit.id}/image?kind=garment&v=${imageVersion}` : null };
  return <OutfitDetailPage look={look} />;
}
