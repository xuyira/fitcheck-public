const CREATE_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis";
const TASK_URL = "https://dashscope.aliyuncs.com/api/v1/tasks";

function apiKey() {
  if (!process.env.DASHSCOPE_API_KEY) throw new Error("服务器尚未配置百炼 API Key");
  return process.env.DASHSCOPE_API_KEY;
}

async function dashscopeResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.code || "百炼服务请求失败");
  return data;
}

export async function createBailianTryOn(personUrl: string, garmentUrl: string) {
  const response = await fetch(CREATE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify({
      model: process.env.DASHSCOPE_MODEL || "aitryon-plus",
      input: { person_image_url: personUrl, top_garment_url: garmentUrl },
      parameters: { resolution: -1, restore_face: true },
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await dashscopeResponse(response);
  const taskId = data.output?.task_id;
  if (!taskId) throw new Error("百炼没有返回任务编号");
  return taskId as string;
}

export async function getBailianTryOn(taskId: string) {
  const response = await fetch(`${TASK_URL}/${encodeURIComponent(taskId)}`, {
    headers: { Authorization: `Bearer ${apiKey()}` },
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  return dashscopeResponse(response);
}
