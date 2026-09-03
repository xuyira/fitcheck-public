import { OutfitDetailPage } from "@/components/wardrobe/outfit-detail-page";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { serializeOutfit } from "@/lib/serializers";

export default async function OutfitPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(); const { id } = await params; const outfit = await db.outfit.findFirst({ where: { id, userId: user.id } });
  if (!outfit) return <div className="empty-state"><h2>穿搭不存在</h2></div>;
  return <OutfitDetailPage look={serializeOutfit(outfit)} />;
}
