"use client";

import { CalendarDays, Download, RotateCcw, Shirt } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { BackgroundPicker, BackgroundStepper, StickerStage } from "@/components/background/background-controls";
import { DatePickerModal } from "@/components/modals/date-picker-modal";
import { LoginModal } from "@/components/modals/login-modal";
import { apiFetch, fileToDataUrl } from "@/lib/client-api";
import { downloadImage } from "@/lib/download-image";
import { getBackgroundPreset, type BackgroundSettings } from "@/lib/backgrounds";
import type { Look } from "@/lib/types";

interface ResultViewProps { resultImage: string; stickerImage: string; person: string; garment: string; initialBackground: BackgroundSettings; regenerate: () => void }

export function ResultView({ resultImage, stickerImage, person, garment, initialBackground, regenerate }: ResultViewProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState(initialBackground);
  const [loginOpen, setLoginOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [pending, setPending] = useState<"wardrobe" | "calendar" | null>(null);
  const [savedOutfit, setSavedOutfit] = useState<Look | null>(null);
  const [message, setMessage] = useState("");

  const ensureSaved = async () => {
    if (savedOutfit) return savedOutfit;
    const { outfit } = await apiFetch<{ outfit: Look }>("/api/outfits", { method: "POST", body: JSON.stringify({ finalImage: resultImage, stickerImage, source: "AI_TRY_ON", personImage: person, garmentImage: garment, backgroundImage: settings.backgroundImage, backgroundKey: settings.backgroundKey, stickerScale: settings.stickerScale }) });
    setSavedOutfit(outfit); return outfit;
  };
  const requestSave = (target: "wardrobe" | "calendar", authenticated = false) => {
    if (!user && !authenticated) { setPending(target); setLoginOpen(true); return; }
    if (target === "calendar") { setDateOpen(true); return; }
    void ensureSaved().then(() => setMessage("已保存到衣橱")).catch((e) => setMessage(e instanceof Error ? e.message : "保存失败"));
  };
  const addToCalendar = async (date: string) => {
    try { const outfit = await ensureSaved(); await apiFetch("/api/calendar", { method: "POST", body: JSON.stringify({ outfitId: String(outfit.id), date, backgroundImage: settings.backgroundImage, backgroundKey: settings.backgroundKey, stickerScale: settings.stickerScale }) }); setDateOpen(false); setMessage("已保存到衣橱并添加到日历"); }
    catch (e) { setMessage(e instanceof Error ? e.message : "添加失败"); }
  };
  const updateSettings = (next: BackgroundSettings) => {
    setSettings(next);
    if (savedOutfit) void apiFetch(`/api/outfits/${savedOutfit.id}`, { method: "PATCH", body: JSON.stringify(next) }).catch(() => undefined);
  };

  const downloadComposite = async () => {
    if (settings.backgroundKey === "none") return downloadImage(stickerImage, "fitcheck-image");
    const stage = document.querySelector(".result-image .sticker-stage") as HTMLElement | null; const box = document.querySelector(".result-image .sticker-box") as HTMLElement | null; if (!stage || !box) throw new Error("图片处理失败");
    const stageRect = stage.getBoundingClientRect(); const canvas = document.createElement("canvas"); canvas.width = Math.round(stageRect.width); canvas.height = Math.round(stageRect.height); const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("图片处理失败");
    const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
    const preset = getBackgroundPreset(settings.backgroundKey); const bg = settings.backgroundKey === "custom" ? settings.backgroundImage : preset.asset;
    if (bg) { const image = await load(bg); const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight); const width = image.naturalWidth * scale; const height = image.naturalHeight * scale; ctx.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height); } else { ctx.fillStyle = preset.fallback; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    const stickerSrc = (box.querySelector(".sticker-subject") as HTMLImageElement | null)?.currentSrc || stickerImage; const sticker = await load(stickerSrc); const boxRect = box.getBoundingClientRect(); const x = boxRect.left - stageRect.left; const y = boxRect.top - stageRect.top; ctx.drawImage(sticker, x, y, boxRect.width, boxRect.height); await downloadImage(canvas.toDataURL("image/png"), "fitcheck-image");
  };

  return <>
    <div className="result-page">
      <div className="result-image"><div className="result-background-control"><BackgroundPicker value={settings} onChange={updateSettings} onUpload={(event) => { const file = event.target.files?.[0]; if (!file) return; void fileToDataUrl(file).then((backgroundImage) => updateSettings({ ...settings, backgroundKey: "custom", backgroundImage })).catch((e) => setMessage(e instanceof Error ? e.message : "背景上传失败")); event.target.value = ""; }} /></div><StickerStage interactive containBackground onSettingsChange={updateSettings} sticker={stickerImage} settings={settings} alt="试衣贴纸"><BackgroundStepper value={settings} onChange={updateSettings} /></StickerStage></div>
      <div className="result-actions"><button className="result-action primary" onClick={() => void downloadComposite().then(() => setMessage("图片已开始下载")).catch(() => setMessage("下载失败"))}><Download size={17} />下载图片</button><button className="result-action" onClick={() => requestSave("wardrobe")}><Shirt size={17} />保存到衣橱</button><button className="result-action" onClick={() => requestSave("calendar")}><CalendarDays size={17} />添加到日历</button><button className="result-action" onClick={regenerate}><RotateCcw size={17} />重新生成</button></div>
    </div>
    {message && <p className="result-message">{message}</p>}
    {loginOpen && <LoginModal close={() => setLoginOpen(false)} onSuccess={() => { if (pending) requestSave(pending, true); setPending(null); }} />}
    {dateOpen && <DatePickerModal close={() => setDateOpen(false)} confirm={(date) => void addToCalendar(date)} />}
  </>;
}
