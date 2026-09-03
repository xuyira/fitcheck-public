"use client";

import { ChevronLeft, ChevronRight, Upload } from "lucide-react";
import type { ChangeEvent, CSSProperties } from "react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  BACKGROUND_PRESETS,
  getBackgroundPreset,
  type BackgroundKey,
  type BackgroundSettings,
} from "@/lib/backgrounds";

const trimmedStickerCache = new Map<string, { src: string; ratio: number }>();

interface BackgroundPickerProps {
  value: BackgroundSettings;
  onChange: (value: BackgroundSettings) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  compact?: boolean;
}

export function BackgroundPicker({ value, onChange, onUpload, compact = false }: BackgroundPickerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const id = useId();
  const hasUpload = Boolean(value.backgroundImage);
  const selectValue = value.backgroundKey;
  const [open, setOpen] = useState(false);
  const [hasSelected, setHasSelected] = useState(false);
  const menuPresets = [
    ...BACKGROUND_PRESETS.filter((preset) => preset.key === "original" || preset.key === "none" || preset.key === "white").sort((a, b) => ["original", "none", "white"].indexOf(a.key) - ["original", "none", "white"].indexOf(b.key)),
    ...BACKGROUND_PRESETS.filter((preset) => !["original", "none", "white"].includes(preset.key)).sort((a, b) => a.label.length - b.label.length || a.label.localeCompare(b.label, "zh-CN")),
  ];

  const choose = (next: string) => {
    if (next === "upload") { setHasSelected(true); setOpen(false); fileInput.current?.click(); return; }
    setOpen(false);
    setHasSelected(true);
    onChange({ ...value, backgroundKey: next as BackgroundKey, backgroundImage: next === "custom" ? value.backgroundImage : null });
  };

  return (
    <div className={`background-picker ${compact ? "compact" : ""}`}>
      <span>背景</span>
      <div className="background-select-wrap">
        <button type="button" className="background-change-btn" onClick={() => setOpen((current) => !current)}><span>{!hasSelected ? "更换背景" : hasUpload && selectValue === "custom" ? "已上传的背景" : getBackgroundPreset(selectValue).label}</span></button>
        {open && <div className="background-menu" role="listbox"><button type="button" className="background-menu-upload" onClick={() => choose("upload")}><Upload size={14} />上传背景</button><div className="background-menu-scroll">{menuPresets.map((preset) => <button type="button" className={selectValue === preset.key ? "selected" : ""} key={preset.key} onClick={() => choose(preset.key)}>{preset.label}</button>)}{hasUpload && <button type="button" className={selectValue === "custom" ? "selected" : ""} onClick={() => choose("custom")}>已上传的背景</button>}</div></div>}
      </div>
      <input ref={fileInput} className="visually-hidden" type="file" accept="image/*" onChange={onUpload} />
    </div>
  );
}

interface StickerScaleControlProps {
  value: number;
  onChange: (scale: number) => void;
  compact?: boolean;
}

export function StickerScaleControl({ value, onChange, compact = false }: StickerScaleControlProps) {
  return <label className={`sticker-scale ${compact ? "compact" : ""}`}>
    <span>贴纸大小 <b>{Math.round(value * 100)}%</b></span>
    <input type="range" min="0.6" max="1.4" step="0.05" value={value} onChange={(event) => onChange(Number(event.target.value))} />
  </label>;
}

interface BackgroundStepperProps {
  value: BackgroundSettings;
  onChange: (value: BackgroundSettings) => void;
}

export function BackgroundStepper({ value, onChange }: BackgroundStepperProps) {
  const index = useMemo(() => Math.max(0, BACKGROUND_PRESETS.findIndex((preset) => preset.key === value.backgroundKey)), [value.backgroundKey]);
  const move = (direction: -1 | 1) => {
    const options = BACKGROUND_PRESETS.filter((preset) => preset.key !== "none");
    const current = Math.max(0, options.findIndex((preset) => preset.key === value.backgroundKey));
    const next = options[(current + direction + options.length) % options.length];
    onChange({ ...value, backgroundKey: next.key, backgroundImage: null });
  };
  const preset = getBackgroundPreset(value.backgroundKey);
  if (value.backgroundKey === "none" || value.backgroundKey === "custom") return null;
  return <div className="background-stepper" aria-label="切换预设背景">
    <button aria-label="上一个背景" onClick={() => move(-1)}><ChevronLeft size={21} /></button>
    <span>{preset.label}<small>{index + 1}/{BACKGROUND_PRESETS.length}</small></span>
    <button aria-label="下一个背景" onClick={() => move(1)}><ChevronRight size={21} /></button>
  </div>;
}

interface StickerStageProps {
  sticker: string;
  settings: BackgroundSettings;
  className?: string;
  alt?: string;
  children?: React.ReactNode;
  interactive?: boolean;
  onSettingsChange?: (settings: BackgroundSettings) => void;
  containBackground?: boolean;
  /** Kept for backwards compatibility; server-produced stickers are already trimmed. */
  trimSticker?: boolean;
}

export function StickerStage({ sticker, settings, className = "", alt = "穿搭贴纸", children, interactive = false, onSettingsChange, containBackground = false, trimSticker = false }: StickerStageProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cachedSticker = trimmedStickerCache.get(sticker);
  const [displaySticker, setDisplaySticker] = useState(cachedSticker?.src ?? (trimSticker ? "" : sticker));
  const [stickerRatio, setStickerRatio] = useState(cachedSticker?.ratio ?? 2 / 3);
  const [offset, setOffset] = useState({ x: settings.stickerOffsetX ?? 0, y: settings.stickerOffsetY ?? 0 });
  const [selected, setSelected] = useState(false);
  const [boundary, setBoundary] = useState({ width: 0, height: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const resize = useRef<{ startX: number; startScale: number } | null>(null);
  const preset = getBackgroundPreset(settings.backgroundKey);
  const style: CSSProperties = settings.backgroundKey === "custom" && settings.backgroundImage
    ? { backgroundImage: `url("${settings.backgroundImage}")` }
    : preset.asset ? { backgroundImage: `url("${preset.asset}")` } : (settings.backgroundKey === "none" || settings.backgroundKey === "white" ? { backgroundColor: "#f3f0ea" } : { background: preset.fallback });
  const backgroundSrc = settings.backgroundKey === "custom" && settings.backgroundImage ? settings.backgroundImage : preset.asset;
  useEffect(() => {
    const cached = trimmedStickerCache.get(sticker);
    if (cached) { setDisplaySticker(cached.src); setStickerRatio(cached.ratio); return; }
    if (!trimSticker) { const image = new Image(); image.onload = () => setStickerRatio((image.naturalWidth || 2) / (image.naturalHeight || 3)); image.src = sticker; setDisplaySticker(sticker); return; }
    setDisplaySticker("");
    let cancelled = false; const image = new Image(); image.crossOrigin = "anonymous";
    image.onload = () => { try { const canvas = document.createElement("canvas"); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) return; ctx.drawImage(image, 0, 0); const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data; let left = canvas.width; let top = canvas.height; let right = -1; let bottom = -1; for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) if (pixels[(y * canvas.width + x) * 4 + 3] > 8) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); } if (right < left || bottom < top) return; const padding = Math.max(2, Math.round(Math.max(canvas.width, canvas.height) * .006)); left = Math.max(0, left - padding); top = Math.max(0, top - padding); right = Math.min(canvas.width - 1, right + padding); bottom = Math.min(canvas.height - 1, bottom + padding); const cropped = document.createElement("canvas"); cropped.width = right - left + 1; cropped.height = bottom - top + 1; cropped.getContext("2d")?.drawImage(canvas, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height); const result = { src: cropped.toDataURL("image/png"), ratio: cropped.width / cropped.height }; trimmedStickerCache.set(sticker, result); if (!cancelled) { setStickerRatio(result.ratio); setDisplaySticker(result.src); } } catch { if (!cancelled) setDisplaySticker(sticker); } };
    image.onerror = () => { if (!cancelled) setDisplaySticker(sticker); }; image.src = sticker; return () => { cancelled = true; };
  }, [sticker, trimSticker]);
  useEffect(() => {
    const stage = stageRef.current; if (!stage) return;
    let naturalWidth = 2; let naturalHeight = 3;
    const update = () => { if (containBackground) { setBoundary({ width: stage.clientWidth, height: stage.clientHeight }); return; } const scale = Math.max(stage.clientWidth / naturalWidth, stage.clientHeight / naturalHeight); setBoundary({ width: naturalWidth * scale, height: naturalHeight * scale }); };
    if (!backgroundSrc) update(); else { const image = new Image(); image.onload = () => { naturalWidth = image.naturalWidth || 2; naturalHeight = image.naturalHeight || 3; update(); }; image.src = backgroundSrc; }
    const observer = new ResizeObserver(update); observer.observe(stage); return () => observer.disconnect();
  }, [backgroundSrc, containBackground]);
  return <div ref={stageRef} className={`sticker-stage scene-${settings.backgroundKey} ${className} ${interactive ? "sticker-interactive" : ""}`} style={style} onPointerDown={(event) => { if (interactive && event.target === event.currentTarget) setSelected(false); }} onPointerMove={(event) => { if (drag.current) { const nextOffset = { x: event.clientX - drag.current.x, y: event.clientY - drag.current.y }; setOffset(nextOffset); if (onSettingsChange) onSettingsChange({ ...settings, stickerOffsetX: nextOffset.x, stickerOffsetY: nextOffset.y }); } if (resize.current && onSettingsChange) { const next = Math.min(4, Math.max(0.1, resize.current.startScale + (event.clientX - resize.current.startX) / 260)); onSettingsChange({ ...settings, stickerScale: Math.round(next * 100) / 100 }); } }} onPointerUp={() => { drag.current = null; resize.current = null; }} onPointerLeave={() => { drag.current = null; resize.current = null; }}>
    <div className="sticker-boundary" style={boundary.width ? { width: boundary.width, height: boundary.height } : undefined} onPointerDown={(event) => { if (interactive && event.target === event.currentTarget) setSelected(false); }}><div className={`sticker-box ${selected ? "selected" : ""}`} style={{ width: "auto", height: "88%", aspectRatio: String(stickerRatio), transform: `translate(${offset.x}px, ${offset.y}px) scale(${settings.stickerScale})` }} onPointerDown={(event) => { if (!interactive) return; event.stopPropagation(); setSelected(true); event.currentTarget.setPointerCapture(event.pointerId); drag.current = { x: event.clientX - offset.x, y: event.clientY - offset.y }; }}>
      {displaySticker && <img className="sticker-subject" src={displaySticker} alt={alt} draggable={false} />}
      {interactive && selected && <><span className="sticker-handle sticker-handle-tl" onPointerDown={(event) => { event.stopPropagation(); resize.current = { startX: event.clientX, startScale: settings.stickerScale }; }} /><span className="sticker-handle sticker-handle-tr" onPointerDown={(event) => { event.stopPropagation(); resize.current = { startX: event.clientX, startScale: settings.stickerScale }; }} /><span className="sticker-handle sticker-handle-bl" onPointerDown={(event) => { event.stopPropagation(); resize.current = { startX: event.clientX, startScale: settings.stickerScale }; }} /><span className="sticker-handle sticker-handle-br" onPointerDown={(event) => { event.stopPropagation(); resize.current = { startX: event.clientX, startScale: settings.stickerScale }; }} /></>}
    </div></div>
    {children}
  </div>;
}
