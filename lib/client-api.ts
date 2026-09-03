export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const canRetry = !options?.method || options.method === "GET";
  let response: Response | null = null;

  for (let attempt = 0; attempt < (canRetry ? 4 : 1); attempt += 1) {
    try {
      response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
      break;
    } catch {
      if (attempt === (canRetry ? 3 : 0)) throw new Error("网络连接中断，请刷新页面后重试");
      await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
    }
  }

  if (!response) throw new Error("网络连接中断，请刷新页面后重试");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "请求失败");
  return data as T;
}

export const MAX_IMAGE_FILE_BYTES = 20 * 1024 * 1024;
const MODEL_IMAGE_MAX_BYTES = 4.8 * 1024 * 1024;

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("图片压缩失败")), type, quality));
}

export async function prepareImageForTryOn(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("请选择图片文件");
  if (file.size > MAX_IMAGE_FILE_BYTES) throw new Error("图片不能超过20MB，请压缩后重新上传");
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { throw new Error("无法识别这张图片，请转换为 JPG 或 PNG 后重试"); }
  const scale = Math.min(1, 4096 / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale); const height = Math.round(bitmap.height * scale);
  if (width < 150 || height < 150) { bitmap.close(); throw new Error("图片边长不能小于150px"); }
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) { bitmap.close(); throw new Error("图片处理失败"); }
  context.drawImage(bitmap, 0, 0, width, height); bitmap.close();
  let quality = 0.92; let blob = await canvasToBlob(canvas, "image/jpeg", quality);
  while (blob.size > MODEL_IMAGE_MAX_BYTES && quality > 0.45) { quality -= 0.1; blob = await canvasToBlob(canvas, "image/jpeg", quality); }
  if (blob.size > MODEL_IMAGE_MAX_BYTES) throw new Error("图片压缩后仍超过5MB，请换一张图片重试");
  return fileToDataUrl(new File([blob], "fitcheck-upload.jpg", { type: "image/jpeg" }));
}

export function fileToDataUrl(file: File) {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("请选择图片文件"));
  }
  if (file.size > MAX_IMAGE_FILE_BYTES) {
    return Promise.reject(new Error("图片不能超过20MB，请压缩后重新上传"));
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("无法读取图片"));
    reader.readAsDataURL(file);
  });
}
