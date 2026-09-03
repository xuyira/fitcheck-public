import { removeBackground } from "@imgly/background-removal-node";
import sharp from "sharp";

export async function removeImageBackground(source: string) {
  const base64 = source.slice(source.indexOf(",") + 1);
  const mime = source.slice(5, source.indexOf(";")) || "image/png";
  const input = new Blob([Buffer.from(base64, "base64")], { type: mime });
  const output = await removeBackground(input, { model: "medium", output: { format: "image/png" }, debug: false });
  const rgbaPng = Buffer.from(await output.arrayBuffer());
  // Scan the alpha channel explicitly on the server. This makes the saved
  // sticker's bounds deterministic: every pixel with visible alpha belongs to
  // the person image, and all transparent margins are removed exactly once.
  const { data, info } = await sharp(rgbaPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width; let top = info.height; let right = -1; let bottom = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels + 3] > 8) {
        if (x < left) left = x; if (x > right) right = x; if (y < top) top = y; if (y > bottom) bottom = y;
      }
    }
  }
  const cropped = right < left || bottom < top
    ? rgbaPng
    : await sharp(rgbaPng).extract({ left, top, width: right - left + 1, height: bottom - top + 1 }).png().toBuffer();
  return `data:image/png;base64,${cropped.toString("base64")}`;
}
