import { CalendarOutfitDetail } from "@/components/calendar/calendar-outfit-detail";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { serializeCalendarDetail } from "@/lib/serializers";
import { DEFAULT_BACKGROUND_SETTINGS } from "@/lib/backgrounds";
import { EmptyCalendarDetail } from "@/components/calendar/empty-calendar-detail";

export default async function CalendarDatePage({ params }: { params: Promise<{ date: string }> }) {
  const user = await requireUser(); const { date } = await params;
  const entry = await db.calendarEntry.findFirst({ where: { userId: user.id, date }, include: { outfit: { select: { id: true, source: true, generationStatus: true, backgroundImage: true, backgroundKey: true, stickerScale: true, stickerOffsetX: true, stickerOffsetY: true, createdAt: true } } } });
  if (!entry) return <div className="calendar-date-page"><EmptyCalendarDetail date={date} /></div>;
  const item = serializeCalendarDetail(entry);
  const settings = { ...DEFAULT_BACKGROUND_SETTINGS, backgroundKey: item.backgroundKey ?? item.outfit.backgroundKey ?? "none", backgroundImage: item.background ?? item.outfit.background, stickerScale: item.stickerScale ?? item.outfit.stickerScale ?? 1, stickerOffsetX: item.stickerOffsetX ?? item.outfit.stickerOffsetX ?? 0, stickerOffsetY: item.stickerOffsetY ?? item.outfit.stickerOffsetY ?? 0 };
  return <div className="calendar-date-page"><CalendarOutfitDetail entry={item} settings={settings} /></div>;
}
