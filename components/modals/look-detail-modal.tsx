"use client";

import { ArrowLeft, CalendarDays, Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { BackgroundPicker, BackgroundStepper, StickerStage } from "@/components/background/background-controls";
import { apiFetch, fileToDataUrl } from "@/lib/client-api";
import { downloadImage } from "@/lib/download-image";
import { DEFAULT_BACKGROUND_SETTINGS, getBackgroundPreset, type BackgroundSettings } from "@/lib/backgrounds";
import type { Look } from "@/lib/types";

interface LookDetailModalProps { look: Look; close: () => void; deleteLook: () => void; requestLogin: () => void; calendarEntryId?: string; initialSettings?: BackgroundSettings; onUpdate?: (look: Look, settings: BackgroundSettings) => void }

export function LookDetailModal({ look, close, deleteLook, requestLogin, calendarEntryId, initialSettings, onUpdate }: LookDetailModalProps) {
  const [settings, setSettings] = useState<BackgroundSettings>(initialSettings ?? { ...DEFAULT_BACKGROUND_SETTINGS, backgroundKey: look.backgroundKey ?? "none", backgroundImage: look.background, stickerScale: look.stickerScale ?? 1, stickerOffsetX: look.stickerOffsetX ?? 0, stickerOffsetY: look.stickerOffsetY ?? 0 });
  const [message, setMessage] = useState("");
  const originalImages = [look.person ? { src: look.person, label: "人物" } : null, look.garment ? { src: look.garment, label: "服装" } : null].filter((item): item is { src: string; label: string } => Boolean(item));
  const saveSettings = (next: BackgroundSettings) => {
    setSettings(next); setMessage("正在保存…");
    const endpoint = calendarEntryId ? `/api/calendar/${calendarEntryId}` : `/api/outfits/${look.id}`;
    void apiFetch(endpoint, { method: "PATCH", body: JSON.stringify(next) }).then(() => { onUpdate?.(look, next); setMessage("显示设置已保存"); }).catch((e) => setMessage(e instanceof Error ? e.message : "保存失败"));
  };
  const downloadComposite = async () => { if (settings.backgroundKey === "none") return downloadImage(look.sticker ?? look.image, `fitcheck-${look.id}`); const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 1536; const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("图片处理失败"); const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; }); const preset = getBackgroundPreset(settings.backgroundKey); const bg = settings.backgroundKey === "custom" ? settings.backgroundImage : preset.asset; if (bg) ctx.drawImage(await load(bg), 0, 0, 1024, 1536); else { ctx.fillStyle = preset.fallback; ctx.fillRect(0, 0, 1024, 1536); } ctx.drawImage(await load(look.sticker ?? look.image), 0, 0, 1024, 1536); await downloadImage(canvas.toDataURL("image/png"), `fitcheck-${look.id}`); };
  return <div className="overlay"><div className="detail-modal vertical">
    <div className="detail-top"><button onClick={close}><ArrowLeft size={18} />返回</button><div className="detail-top-actions"><BackgroundPicker compact value={settings} onChange={saveSettings} onUpload={(event) => { const file = event.target.files?.[0]; if (!file) return; void fileToDataUrl(file).then((backgroundImage) => saveSettings({ ...settings, backgroundKey: "custom", backgroundImage })).catch(() => setMessage("背景上传失败")); event.target.value = ""; }} /><button className="danger-btn" onClick={deleteLook}><Trash2 size={17} />删除</button></div></div>
    <div className="detail-image"><StickerStage interactive containBackground onSettingsChange={saveSettings} sticker={look.sticker ?? look.image} settings={settings}><BackgroundStepper value={settings} onChange={saveSettings} /></StickerStage></div>
    <div className="detail-content"><span className="detail-date">{look.date}</span>
      {originalImages.length > 0 && <div className={`source-row source-count-${originalImages.length}`}>{originalImages.map((image) => <div key={image.label}><img src={image.src} alt={image.label} /><small>{image.label}</small></div>)}</div>}
      <div className="detail-actions"><button className="secondary-btn" onClick={() => void downloadComposite().catch(() => setMessage("下载失败"))}><Download size={17} />下载图片</button><button className="primary-btn" onClick={requestLogin}><CalendarDays size={17} />添加到日历</button></div>
      {message && <p className="result-message">{message}</p>}
    </div>
  </div></div>;
}
