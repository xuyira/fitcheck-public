const DEFAULT_BASE_URL = "https://api.aicodewith.ai/chatgpt/v1";

const TRY_ON_PROMPT = [
  "以第一张图为模特，第二张图为服装。",
  "让第一张图中的人物完整穿上第二张图中的整套服装，并生成自然、真实的试穿照片。",
  "保持人物身份、脸部特征、发型、体型、姿势、视角、画面构图和原始背景不变。",
  "准确还原服装的颜色、材质、版型、图案、纹理和细节，不保留人物原有服装，不添加不存在的服饰或配件。",
].join("");

function apiKey() {
  if (!process.env.OPENAI_API_KEY) throw new Error("服务器尚未配置 OpenAI API Key");
  return process.env.OPENAI_API_KEY;
}

async function fetchImage(url: string, name: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`读取${name}图片失败`);
  const type = response.headers.get("content-type") || "image/jpeg";
  return new File([await response.arrayBuffer()], `${name}.jpg`, { type });
}

export async function createOpenAIImageTryOn(personUrl: string, garmentUrl: string) {
  const [person, garment] = await Promise.all([fetchImage(personUrl, "person"), fetchImage(garmentUrl, "garment")]);
  const form = new FormData();
  form.append("model", process.env.OPENAI_IMAGE_MODEL || "gpt-image-2");
  form.append("prompt", process.env.OPENAI_TRY_ON_PROMPT || TRY_ON_PROMPT);
  form.append("size", process.env.OPENAI_IMAGE_SIZE || "1024x1536");
  form.append("quality", process.env.OPENAI_IMAGE_QUALITY || "auto");
  form.append("n", "1");
  form.append("image[]", person);
  form.append("image[]", garment);

  const baseUrl = (process.env.OPENAI_API_BASE || DEFAULT_BASE_URL).replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
    signal: AbortSignal.timeout(240_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.error?.message || data.message || data.error || `HTTP ${response.status}`;
    throw new Error(`OpenAI 图像生成失败：${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
  }
  const item = data.data?.[0];
  if (typeof item?.url === "string") return item.url;
  if (typeof item?.b64_json === "string") return `data:image/png;base64,${item.b64_json}`;
  throw new Error("OpenAI 图像生成完成，但没有返回结果图片");
}
