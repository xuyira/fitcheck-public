"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { StickerStage } from "@/components/background/background-controls";
import { AddChoiceModal } from "@/components/modals/add-choice-modal";
import { DatePickerModal } from "@/components/modals/date-picker-modal";
import { LookDetailModal } from "@/components/modals/look-detail-modal";
import { LoginModal } from "@/components/modals/login-modal";
import { UploadErrorModal } from "@/components/modals/upload-error-modal";
import { CalendarOutfitDetail } from "@/components/calendar/calendar-outfit-detail";
import { apiFetch, fileToDataUrl } from "@/lib/client-api";
import { DEFAULT_BACKGROUND_SETTINGS, type BackgroundSettings } from "@/lib/backgrounds";
import type { CalendarItem, Look } from "@/lib/types";

export function CalendarView() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const [demoLoading, setDemoLoading] = useState(false);
  const enterDemo = async () => { setDemoLoading(true); try { await apiFetch("/api/auth/demo", { method: "POST" }); await refresh(); } catch (error) { setError(error instanceof Error ? error.message : "演示账号进入失败"); } finally { setDemoLoading(false); } };
  const [cursor, setCursor] = useState(new Date(2026, 8, 1));
  const [entries, setEntries] = useState<CalendarItem[]>([]);
  const [selected, setSelected] = useState<CalendarItem | null>(null);
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [wardrobeLooks, setWardrobeLooks] = useState<Look[]>([]);
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const days = new Date(year, month + 1, 0).getDate(); const first = new Date(year, month, 1).getDay();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const loadEntries = useCallback(async () => {
    if (!user) { setEntries([]); setLoading(false); return; }
    setLoading(true);
    try { const data = await apiFetch<{ entries: CalendarItem[] }>(`/api/calendar?month=${monthKey}`); setEntries(data.entries); }
    catch (error) { setError(error instanceof Error ? error.message : "加载失败"); }
    finally { setLoading(false); }
  }, [user, monthKey]);
  useEffect(() => { if (!authLoading) void loadEntries(); }, [authLoading, loadEntries]);
  const byDate = useMemo(() => new Map(entries.map((entry) => [entry.date, entry])), [entries]);

  const uploadToDate = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file || !pendingDate) return;
    try {
      const finalImage = await fileToDataUrl(file);
      const { outfit } = await apiFetch<{ outfit: Look }>("/api/outfits", { method: "POST", body: JSON.stringify({ finalImage }) });
      await apiFetch("/api/calendar", { method: "POST", body: JSON.stringify({ outfitId: String(outfit.id), date: pendingDate }) });
      setAddOpen(false); setPendingDate(null); await loadEntries();
    } catch (error) { setUploadError(error instanceof Error ? error.message : "上传失败，请重新选择"); }
    finally { event.target.value = ""; }
  };
  const openWardrobe = async () => { try { const data = await apiFetch<{ outfits: Look[] }>("/api/outfits"); setWardrobeLooks(data.outfits); setAddOpen(false); setWardrobeOpen(true); } catch (error) { setError(error instanceof Error ? error.message : "衣橱加载失败"); } };
  const addWardrobeToDate = async (look: Look) => { if (!pendingDate) return; try { await apiFetch("/api/calendar", { method: "POST", body: JSON.stringify({ outfitId: String(look.id), date: pendingDate, backgroundImage: look.background, backgroundKey: look.backgroundKey, stickerScale: look.stickerScale }) }); setWardrobeOpen(false); setPendingDate(null); await loadEntries(); } catch (error) { setError(error instanceof Error ? error.message : "添加失败"); } };
  const deleteEntry = async (entry: CalendarItem) => { try { await apiFetch(`/api/calendar/${entry.id}`, { method: "DELETE" }); setEntries((current) => current.filter((item) => item.id !== entry.id)); setSelected(null); } catch (error) { setError(error instanceof Error ? error.message : "删除失败"); } };
  const addSelectedToDate = async (date: string) => {
    if (!selected) return;
    try {
      await apiFetch("/api/calendar", { method: "POST", body: JSON.stringify({ outfitId: String(selected.outfit.id), date }) });
      const [targetYear, targetMonth] = date.split("-").map(Number);
      const targetMonthKey = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
      setDateOpen(false);
      setSelected(null);
      if (targetMonthKey === monthKey) await loadEntries();
      else setCursor(new Date(targetYear, targetMonth - 1, 1));
    } catch (error) {
      setError(error instanceof Error ? error.message : "添加失败");
      setDateOpen(false);
    }
  };

  if (authLoading || loading) return <div className="loading-state">正在加载…</div>;
  if (!user) return <><div className="empty-state"><h2>登录后查看日历</h2><p>你的穿搭计划会按账号独立保存。</p><button className="primary-btn" onClick={() => setLoginOpen(true)}>登录或注册</button><button className="secondary-btn" onClick={() => void enterDemo()} disabled={demoLoading}>{demoLoading ? "正在进入…" : "进入演示账号"}</button></div>{loginOpen && <LoginModal close={() => setLoginOpen(false)} />}</>;

  const settingsFor = (entry: CalendarItem): BackgroundSettings => ({ ...DEFAULT_BACKGROUND_SETTINGS, backgroundKey: entry.backgroundKey ?? entry.outfit.backgroundKey ?? "none", backgroundImage: entry.background ?? entry.outfit.background, stickerScale: 1, stickerOffsetX: 0, stickerOffsetY: 0 });
  const updateEntry = (_look: Look, settings: BackgroundSettings) => { if (!selected) return; const next = { ...selected, background: settings.backgroundImage, backgroundKey: settings.backgroundKey, stickerScale: settings.stickerScale, stickerOffsetX: settings.stickerOffsetX, stickerOffsetY: settings.stickerOffsetY }; setEntries((current) => current.map((item) => item.id === selected.id ? next : item)); setSelected(next); };
  const selectedSettings = selected ? settingsFor(selected) : null;
  const changeSelectedDate = (direction: -1 | 1) => { if (!selected) return; const dates = Array.from(byDate.keys()).sort(); const index = dates.indexOf(selected.date); const next = dates[index + direction]; if (next) { const item = byDate.get(next); if (item) setSelected(item); } };
  return <>{error && <p className="form-error">{error}</p>}<div className="calendar-page"><section className="calendar-card"><div className="calendar-title"><button aria-label="上一年" onClick={() => setCursor(new Date(year - 1, month, 1))}><ChevronsLeft size={15} /></button><button aria-label="上个月" onClick={() => setCursor(new Date(year, month - 1, 1))}><ChevronLeft size={15} /></button><h2>{year}年{month + 1}月</h2><button aria-label="下个月" onClick={() => setCursor(new Date(year, month + 1, 1))}><ChevronRight size={15} /></button><button aria-label="下一年" onClick={() => setCursor(new Date(year + 1, month, 1))}><ChevronsRight size={15} /></button></div><div className="calendar-grid">{["日", "一", "二", "三", "四", "五", "六"].map((day) => <div className="weekday" key={day}>{day}</div>)}{Array.from({ length: first + days }, (_, index) => { const day = index < first ? null : index - first + 1; if (!day) return <div className="day-empty" key={index} />; const date = `${monthKey}-${String(day).padStart(2, "0")}`; const entry = byDate.get(date); return <button className={`day ${entry ? "has-look" : ""}`} key={date} onClick={() => router.push(`/calendar/${date}`)}><span>{entry ? <StickerStage trimSticker={false} className="calendar-sticker" containBackground sticker={entry.outfit.sticker ?? entry.outfit.image} settings={settingsFor(entry)} /> : day}</span></button>; })}</div></section></div>{dateOpen && selected && <DatePickerModal close={() => setDateOpen(false)} confirm={(date) => void addSelectedToDate(date)} />}{addOpen && <AddChoiceModal close={() => setAddOpen(false)} startTry={() => router.push("/try")} uploadImage={(event) => void uploadToDate(event)} chooseWardrobe={() => { setAddOpen(false); setError("请先选择一个已有日期，再从衣橱添加"); }} />}{uploadError && <UploadErrorModal message={uploadError} confirm={() => setUploadError("")} />}</>;
}
