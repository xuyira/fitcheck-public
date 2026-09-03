import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function decode(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return { type: match[1], data: Buffer.from(match[2], "base64") };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const kind = new URL(request.url).searchParams.get("kind") ?? "sticker";
    const outfit = await db.outfit.findFirst({ where: { id, userId: user.id }, select: { stickerImage: true, finalImage: true, personImage: true, garmentImage: true } });
    if (!outfit) return new NextResponse("Not found", { status: 404 });
    const source = kind === "person" ? outfit.personImage : kind === "garment" ? outfit.garmentImage : kind === "original" ? outfit.finalImage : outfit.stickerImage ?? outfit.finalImage;
    const image = source ? decode(source) : null;
    if (!image) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(image.data, { headers: { "Content-Type": image.type, "Cache-Control": "private, max-age=3600" } });
  } catch { return new NextResponse("Unauthorized", { status: 401 }); }
}
