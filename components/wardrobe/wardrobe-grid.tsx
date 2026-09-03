"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { StickerStage } from "@/components/background/background-controls";
import { AddChoiceModal } from "@/components/modals/add-choice-modal";
import { LookDetailModal } from "@/components/modals/look-detail-modal";
import { LoginModal } from "@/components/modals/login-modal";
import { DatePickerModal } from "@/components/modals/date-picker-modal";
import { UploadErrorModal } from "@/components/modals/upload-error-modal";
import { apiFetch, fileToDataUrl } from "@/lib/client-api";
import { DEFAULT_BACKGROUND_SETTINGS, type BackgroundSettings } from "@/lib/backgrounds";
import type { Look } from "@/lib/types";

export function WardrobeGrid() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);
  const enterDemo = async () => { setDemoLoading(true); try { await apiFetch("/api/auth/demo", { method: "POST" }); await refresh(); } catch (error) { setError(error instanceof Error ? error.message : "演示账号进入失败"); } finally { setDemoLoading(false); } };
  const [selected, setSelected] = useState<Look | null>(null);
  const [wardrobeLooks, setWardrobeLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const loadOutfits = useCallback(async () => {
    if (!user) { setWardrobeLooks([]); setLoading(false); return; }
    setLoading(true); setError("");
    try { const data = await apiFetch<{ outfits: Look[] }>("/api/outfits"); setWardrobeLooks(data.outfits); }
    catch (error) { setError(error instanceof Error ? error.message : "加载失败"); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { if (!authLoading) void loadOutfits(); }, [authLoading, loadOutfits]);

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!user) { setAddOpen(false); setLoginOpen(true); return; }
    try {
      const finalImage = await fileToDataUrl(file);
      const data = await apiFetch<{ outfit: Look }>("/api/outfits", { method: "POST", body: JSON.stringify({ finalImage }) });
      setWardrobeLooks((current) => [data.outfit, ...current]); setAddOpen(false);
    } catch (error) { setUploadError(error instanceof Error ? error.message : "上传失败，请重新选择"); }
    finally { event.target.value = ""; }
  };

  const deleteLook = async (lookId: Look["id"]) => {
    try { await apiFetch(`/api/outfits/${lookId}`, { method: "DELETE" }); setWardrobeLooks((current) => current.filter((look) => look.id !== lookId)); setSelected(null); }
    catch (error) { setError(error instanceof Error ? error.message : "删除失败"); }
  };

  const addToCalendar = async (look: Look, date: string) => {
    try { await apiFetch("/api/calendar", { method: "POST", body: JSON.stringify({ outfitId: String(look.id), date, backgroundImage: look.background, backgroundKey: look.backgroundKey, stickerScale: look.stickerScale }) }); setDateOpen(false); setSelected(null); }
    catch (error) { setError(error instanceof Error ? error.message : "添加失败"); }
  };

  if (authLoading || loading) return <div className="loading-state">正在加载…</div>;
  if (!user) return <><div className="empty-state"><h2>登录后查看衣橱</h2><p>保存的穿搭只会显示在你的账号中。</p><button className="primary-btn" onClick={() => setLoginOpen(true)}>登录或注册</button><button className="secondary-btn" onClick={() => void enterDemo()} disabled={demoLoading}>{demoLoading ? "正在进入…" : "进入演示账号"}</button></div>{loginOpen && <LoginModal close={() => setLoginOpen(false)} />}</>;

  // Cards are a deterministic preview: use the standard canvas and center the sticker,
  // independent of the editing coordinates saved in the detail page.
  const settingsFor = (look: Look): BackgroundSettings => ({ ...DEFAULT_BACKGROUND_SETTINGS, backgroundKey: look.backgroundKey ?? "none", backgroundImage: look.background, stickerScale: 1, stickerOffsetX: 0, stickerOffsetY: 0 });
  const updateLook = (look: Look, settings: BackgroundSettings) => { const next = { ...look, background: settings.backgroundImage, backgroundKey: settings.backgroundKey, stickerScale: settings.stickerScale }; setWardrobeLooks((current) => current.map((item) => item.id === look.id ? next : item)); setSelected(next); };
  return <>{error && <p className="form-error">{error}</p>}<div className="look-grid"><button className="add-tile" onClick={() => setAddOpen(true)}><span><Plus size={22} /></span><b>添加新穿搭</b></button>{wardrobeLooks.map((look) => <article className="look-card" key={look.id}><div className="look-image" onClick={() => router.push(`/wardrobe/${look.id}`)}>{look.generationStatus === "GENERATING" ? <div className="generation-card-placeholder"><span className="loading-spinner" /><b>生成中</b><small>完成后自动更新</small></div> : <StickerStage className="wardrobe-preview" containBackground trimSticker={false} sticker={look.sticker ?? look.image} settings={settingsFor(look)} />}<button className="card-delete" aria-label="删除" onClick={(event) => { event.stopPropagation(); void deleteLook(look.id); }}><Trash2 size={16} /></button></div></article>)}</div>{addOpen && <AddChoiceModal close={() => setAddOpen(false)} startTry={() => router.push("/try")} uploadImage={(event) => void uploadImage(event)} />}{dateOpen && selected && <DatePickerModal close={() => setDateOpen(false)} confirm={(date) => void addToCalendar(selected, date)} />}{uploadError && <UploadErrorModal message={uploadError} confirm={() => setUploadError("")} />}</>;
}
