import OSS from "ali-oss";
import { randomUUID } from "node:crypto";

const MODEL_MAX_BYTES = 5 * 1024 * 1024;

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`服务器缺少 ${name} 配置`);
  return value;
}

function ossClient() {
  return new OSS({
    region: required("ALIYUN_OSS_REGION"),
    endpoint: required("ALIYUN_OSS_ENDPOINT"),
    bucket: required("ALIYUN_OSS_BUCKET"),
    accessKeyId: required("ALIYUN_ACCESS_KEY_ID"),
    accessKeySecret: required("ALIYUN_ACCESS_KEY_SECRET"),
    secure: true,
  });
}

export function decodeImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|bmp|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error("图片格式不支持，请上传 JPG、PNG、BMP 或 WEBP 图片");
  const data = Buffer.from(match[2], "base64");
  if (data.length < 5 * 1024) throw new Error("图片文件不能小于5KB");
  if (data.length > MODEL_MAX_BYTES) throw new Error("图片处理后仍超过5MB，请换一张图片重试");
  return { data, contentType: match[1] === "image/jpg" ? "image/jpeg" : match[1] };
}

export async function uploadTemporaryModelImage(dataUrl: string, kind: "person" | "garment") {
  const { data, contentType } = decodeImageDataUrl(dataUrl);
  const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : contentType === "image/bmp" ? "bmp" : "jpg";
  const objectName = `try-on/input/${new Date().toISOString().slice(0, 10)}/${kind}-${randomUUID()}.${extension}`;
  const client = ossClient();
  await client.put(objectName, data, { headers: { "Content-Type": contentType } });
  return client.signatureUrl(objectName, { expires: 60 * 60 });
}

export async function remoteImageToDataUrl(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error("无法读取百炼生成结果");
  const contentType = response.headers.get("content-type")?.split(";")[0] || "image/jpeg";
  const data = Buffer.from(await response.arrayBuffer());
  return `data:${contentType};base64,${data.toString("base64")}`;
}
