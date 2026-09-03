import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    const [outfits, calendarDays] = await Promise.all([
      db.outfit.count({ where: { userId: user.id } }),
      db.calendarEntry.count({ where: { userId: user.id } }),
    ]);
    return NextResponse.json({ outfits, calendarDays });
  } catch (error) { return apiError(error); }
}
