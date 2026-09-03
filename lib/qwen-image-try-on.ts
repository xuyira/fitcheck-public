const DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/api/v1";
const GENERATION_PATH = "/services/aigc/multimodal-generation/generation";

const TRY_ON_PROMPT = [
  "以第一张图为模特，第二张图为服装。",
  "让第一张图中的人物完整穿上第二张图中的整套服装，并生成自然、真实的试穿照片。",
  "严格保持第一张图中人物的身份、脸部特征、发型、体型、姿势、视角、画面构图和原始背景不变。",
  "准确还原第二张图中服装的颜色、材质、版型、图案、纹理和细节，不保留人物原有服装，不添加第二张图中不存在的服饰或配件。",
].join("");

function apiKey() {
  if (!process.env.DASHSCOPE_API_KEY) throw new Error("服务器尚未配置百炼 API Key");
  return process.env.DASHSCOPE_API_KEY;
}

function baseUrl() {
  return (process.env.DASHSCOPE_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

async function dashscopeResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.code || "千问图像生成请求失败");
  }
  return data;
}

export async function createQwenImageTryOn(personUrl: string, garmentUrl: string) {
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${GENERATION_PATH}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.QWEN_IMAGE_MODEL || "qwen-image-3.0-pro",
        input: {
          messages: [{
            role: "user",
            content: [
              { image: personUrl },
              { image: garmentUrl },
              { text: process.env.QWEN_TRY_ON_PROMPT || TRY_ON_PROMPT },
            ],
          }],
        },
        parameters: {
          prompt_extend: true,
          watermark: false,
        },
      }),
      // Pro 模型高峰期可能超过 4 分钟；给同步生成留出完整时间。
      signal: AbortSignal.timeout(540_000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("千问 Pro 生成耗时超过9分钟，请稍后重试或换一组图片");
    }
    throw error;
  }
  const data = await dashscopeResponse(response);
  const content = data.output?.choices?.[0]?.message?.content;
  const imageItem = Array.isArray(content)
    ? content.find((item: unknown): item is { image: unknown } => typeof item === "object" && item !== null && "image" in item)
    : undefined;
  const imageUrl = imageItem?.image;
  if (typeof imageUrl !== "string") {
    throw new Error("千问图像生成完成，但没有返回结果图片");
  }
  return imageUrl;
}
