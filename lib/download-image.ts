function extensionFor(type: string) {
  if (type.includes("png")) return "png";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  return "jpg";
}

export async function downloadImage(imageUrl: string, basename = "fitcheck") {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error("图片读取失败，请稍后重试");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = `${basename}.${extensionFor(blob.type)}`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
