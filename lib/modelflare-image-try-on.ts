const DEFAULT_BASE_URL = "https://origin.modelflare.dev/v1";

const TRY_ON_PROMPT = [
  "第一张参考图是人物原图，第二张参考图是需要试穿的服装图。",
  "只替换第一张图中人物身上的服装，让人物完整穿上第二张图中的整套服装，生成自然真实的试穿照片。",
  "人物的脸部必须与第一张图完全一致，不得重绘、替换、美化或改变五官、脸型、肤色、年龄和表情。",
  "严格保持第一张图中人物的身份、发型、体型、姿势、视角、画面构图和原始背景不变。",
  "准确还原第二张图中服装的颜色、材质、版型、图案、纹理和细节，不保留人物原有服装，不添加第二张图中不存在的服饰或配件。",
].join("");

function apiKey() {
  if (!process.env.MODELFLARE_API_KEY) throw new Error("服务器尚未配置 ModelFlare API Key");
  return process.env.MODELFLARE_API_KEY;
}

function outputSize(width?: number, height?: number) {
  if (!width || !height || width <= 0 || height <= 0) return "1024x1024";
  const ratio = Math.min(3, Math.max(1 / 3, width / height));
  let targetWidth = ratio >= 1 ? 1536 : 1536 * ratio;
  let targetHeight = ratio >= 1 ? 1536 / ratio : 1536;
  const pixels = targetWidth * targetHeight;
  if (pixels < 660_000) {
    const scale = Math.sqrt(660_000 / pixels);
    targetWidth *= scale;
    targetHeight *= scale;
  }
  const round16 = (value: number) => Math.max(16, Math.round(value / 16) * 16);
  return `${round16(targetWidth)}x${round16(targetHeight)}`;
}

export async function createModelFlareTryOn(personUrl: string, garmentUrl: string, width?: number, height?: number) {
  const baseUrl = (process.env.MODELFLARE_API_BASE || DEFAULT_BASE_URL).replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.MODELFLARE_IMAGE_MODEL || "gpt-image-2",
      prompt: process.env.MODELFLARE_TRY_ON_PROMPT || TRY_ON_PROMPT,
      images: [{ image_url: personUrl }, { image_url: garmentUrl }],
      quality: process.env.MODELFLARE_IMAGE_QUALITY || "medium",
      size: outputSize(width, height),
      response_format: "url",
      output_format: "png",
      n: 1,
    }),
    signal: AbortSignal.timeout(300_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.error?.message || data.message || data.error || `HTTP ${response.status}`;
    throw new Error(`ModelFlare 图像生成失败：${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
  }
  const imageUrl = data.data?.[0]?.url;
  if (typeof imageUrl !== "string") throw new Error("ModelFlare 图像生成完成，但没有返回结果图片");
  return imageUrl;
}
