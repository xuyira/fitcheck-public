"use client";

import { ArrowLeft, CalendarDays, Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BackgroundPicker, BackgroundStepper, StickerStage } from "@/components/background/background-controls";
import { DatePickerModal } from "@/components/modals/date-picker-modal";
import { apiFetch, fileToDataUrl } from "@/lib/client-api";
import { downloadImage } from "@/lib/download-image";
import { DEFAULT_BACKGROUND_SETTINGS, getBackgroundPreset, type BackgroundSettings } from "@/lib/backgrounds";
import type { Look } from "@/lib/types";

export function OutfitDetailPage({ look }: { look: Look }) {
  const router = useRouter();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sticker = look.generationStatus === "GENERATING" ? "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" : (look.sticker ?? look.image);
  const [settings, setSettings] = useState<BackgroundSettings>({ ...DEFAULT_BACKGROUND_SETTINGS, backgroundKey: look.backgroundKey ?? "none", backgroundImage: look.background, stickerScale: look.stickerScale ?? 1, stickerOffsetX: look.stickerOffsetX ?? 0, stickerOffsetY: look.stickerOffsetY ?? 0 });
  const [dateOpen, setDateOpen] = useState(false); const [message, setMessage] = useState("");
  const originals = [look.person ? { src: look.person, label: "人物" } : null, look.garment ? { src: look.garment, label: "服装" } : null].filter((item): item is { src: string; label: string } => Boolean(item));
  const save = (next: BackgroundSettings) => { setSettings(next); if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => { void apiFetch(`/api/outfits/${look.id}`, { method: "PATCH", body: JSON.stringify(next) }).catch(() => setMessage("保存失败")); }, 250); };
  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);
  const deleteLook = async () => { if (!window.confirm("确定删除这套穿搭吗？")) return; try { await apiFetch(`/api/outfits/${look.id}`, { method: "DELETE" }); router.push("/wardrobe"); } catch (e) { setMessage(e instanceof Error ? e.message : "删除失败"); } };
  const downloadComposite = async () => {
    if (settings.backgroundKey === "none") return downloadImage(sticker, `fitcheck-${look.id}`);
    const stage = document.querySelector(".outfit-detail-stage .sticker-stage") as HTMLElement | null; const box = document.querySelector(".outfit-detail-stage .sticker-box") as HTMLElement | null;
    if (!stage || !box) return downloadImage(sticker, `fitcheck-${look.id}`);
    const outputScale = 2; const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(stage.clientWidth * outputScale)); canvas.height = Math.max(1, Math.round(stage.clientHeight * outputScale)); const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("图片处理失败"); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
    const preset = getBackgroundPreset(settings.backgroundKey); const bgSrc = settings.backgroundKey === "custom" ? settings.backgroundImage : preset.asset;
    if (settings.backgroundKey === "white") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height); } else if (bgSrc) { const image = await load(bgSrc); const scale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight); const w = image.naturalWidth * scale; const h = image.naturalHeight * scale; ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h); } else { ctx.fillStyle = preset.fallback; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    const stickerSrc = (box.querySelector(".sticker-subject") as HTMLImageElement | null)?.currentSrc || sticker; const image = await load(stickerSrc); const sr = stage.getBoundingClientRect(); const br = box.getBoundingClientRect(); ctx.drawImage(image, (br.left - sr.left) * outputScale, (br.top - sr.top) * outputScale, br.width * outputScale, br.height * outputScale); await downloadImage(canvas.toDataURL("image/png"), `fitcheck-${look.id}`);
  };
  const addDate = async (date: string) => { try { await apiFetch("/api/calendar", { method: "POST", body: JSON.stringify({ outfitId: String(look.id), date, backgroundImage: settings.backgroundImage, backgroundKey: settings.backgroundKey, stickerScale: settings.stickerScale, stickerOffsetX: settings.stickerOffsetX, stickerOffsetY: settings.stickerOffsetY }) }); setDateOpen(false); setMessage("已添加到日历"); } catch (e) { setMessage(e instanceof Error ? e.message : "添加失败"); } };
  return <div className="outfit-detail-page"><div className="outfit-detail-layout"><div className="outfit-detail-stage"><StickerStage interactive containBackground onSettingsChange={save} sticker={sticker} settings={settings}><BackgroundStepper value={settings} onChange={save} /></StickerStage></div><aside className="outfit-detail-side"><h1>穿搭详情</h1><div className="outfit-detail-actions"><button className="detail-side-btn" onClick={() => router.push("/wardrobe")}><ArrowLeft size={17} />返回</button><button className="detail-side-btn danger" onClick={() => void deleteLook()}><Trash2 size={17} />删除</button><BackgroundPicker value={settings} onChange={save} onUpload={(event) => { const file = event.target.files?.[0]; if (!file) return; void fileToDataUrl(file).then((backgroundImage) => save({ ...settings, backgroundKey: "custom", backgroundImage })).catch(() => setMessage("背景上传失败")); event.target.value = ""; }} /><button className="detail-side-btn" onClick={() => void downloadComposite().catch(() => setMessage("下载失败"))}><Download size={17} />下载图片</button><button className="detail-side-btn primary" onClick={() => setDateOpen(true)}><CalendarDays size={17} />添加到日历</button></div>{originals.length > 0 && <div className="outfit-originals" aria-label="原始照片" data-date={look.date}>{originals.map((item) => <div className="outfit-original-item" key={item.label}><img src={item.src} alt={item.label} /><span>{item.label}</span></div>)}</div>}{message && <p className="result-message">{message}</p>}</aside></div>{dateOpen && <DatePickerModal close={() => setDateOpen(false)} confirm={(date) => void addDate(date)} />}</div>;
}
