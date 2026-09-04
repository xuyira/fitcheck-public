import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

function decode(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return { type: match[1], data: Buffer.from(match[2], "base64") };
}
const decodedCache = new Map<string, { type: string; data: Buffer }>();

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const kind = new URL(request.url).searchParams.get("kind") ?? "sticker";
    let source: string | null = null;
    if (kind === "person") source = (await db.outfit.findFirst({ where: { id, userId: user.id }, select: { personImage: true } }))?.personImage ?? null;
    else if (kind === "garment") source = (await db.outfit.findFirst({ where: { id, userId: user.id }, select: { garmentImage: true } }))?.garmentImage ?? null;
    else if (kind === "original") source = (await db.outfit.findFirst({ where: { id, userId: user.id }, select: { finalImage: true } }))?.finalImage ?? null;
    else { const outfit = await db.outfit.findFirst({ where: { id, userId: user.id }, select: { stickerImage: true, finalImage: true } }); source = outfit?.stickerImage ?? outfit?.finalImage ?? null; }
    let image = source ? decodedCache.get(source) : null;
    if (!image && source) { image = decode(source); if (image) { const first = decodedCache.keys().next().value; if (decodedCache.size > 40 && first) decodedCache.delete(first); decodedCache.set(source, image); } }
    if (!image) return new NextResponse("Not found", { status: 404 });
    // The sticker changes in-place when a generating placeholder is completed.
    // Do not let the browser keep the placeholder (person image) for the same
    // URL after the final sticker is written.
    return new NextResponse(new Uint8Array(image.data), { headers: { "Content-Type": image.type, "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch { return new NextResponse("Unauthorized", { status: 401 }); }
}
