"use client";

import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { BackgroundPicker, StickerStage } from "@/components/background/background-controls";
import { ResultView } from "@/components/try-on/result-view";
import { UploadErrorModal } from "@/components/modals/upload-error-modal";
import { apiFetch, fileToDataUrl, prepareImageForTryOn } from "@/lib/client-api";
import { DEFAULT_BACKGROUND_SETTINGS, getBackgroundPreset, type BackgroundSettings } from "@/lib/backgrounds";
import type { UploadKind } from "@/lib/types";

function imageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("无法读取图片尺寸"));
    image.src = src;
  });
}

const stepCopy = {
  1: { title: "上传一张全身照", description: "清晰、正面的照片能帮助我们更准确地完成试衣。" },
  2: { title: "上传一张服装照", description: "清晰、平铺的服装照片能帮助我们保留更多服装细节。" },
  3: { title: "上传一张背景图", description: "背景有助于更好地呈现穿搭效果。" },
} as const;

export function TryOnFlow() {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [person, setPerson] = useState<string | null>(null);
  const [personSize, setPersonSize] = useState<{ width: number; height: number } | null>(null);
  const [garment, setGarment] = useState<string | null>(null);
  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>({ ...DEFAULT_BACKGROUND_SETTINGS, backgroundKey: "none" });
  const [result, setResult] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [stickerImage, setStickerImage] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState("正在准备图片");
  const [savedOutfit, setSavedOutfit] = useState<import("@/lib/types").Look | null>(null);

  useEffect(() => {
    if (!generating) return;
    const timer = window.setInterval(() => {
      setGenerationProgress((current) => {
        const next = Math.min(92, current + (current < 35 ? 4 : current < 70 ? 2 : 1));
        if (next >= 70) setGenerationStage("正在完成穿搭细节");
        else if (next >= 35) setGenerationStage("正在生成试衣效果");
        else setGenerationStage("正在分析人物与服装");
        return next;
      });
    }, 1200);
    return () => window.clearInterval(timer);
  }, [generating]);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>, kind: UploadKind) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const url = kind === "background" ? await fileToDataUrl(file) : await prepareImageForTryOn(file);
      if (kind === "person") { setPerson(url); setPersonSize(await imageDimensions(url)); }
      if (kind === "garment") setGarment(url);
      if (kind === "background") setBackgroundSettings((current) => ({ ...current, backgroundKey: "custom", backgroundImage: url }));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "无法读取这张图片，请重新选择");
    } finally {
      event.target.value = "";
    }
  };
  const canContinue = step === 1 ? Boolean(person) : step === 2 ? Boolean(garment) : true;
  const current = stepCopy[step];
  const backgroundGuide = backgroundSettings.backgroundKey === "original"
    ? (person ?? "/default-person.png")
    : backgroundSettings.backgroundKey === "none" || backgroundSettings.backgroundKey === "white"
      ? "/background-guide.png"
      : backgroundSettings.backgroundKey === "custom" && backgroundSettings.backgroundImage
        ? backgroundSettings.backgroundImage
        : getBackgroundPreset(backgroundSettings.backgroundKey).asset ?? "/background-guide.png";
  const generatingBackground = backgroundSettings.backgroundKey === "custom" && backgroundSettings.backgroundImage
    ? backgroundSettings.backgroundImage
    : backgroundSettings.backgroundKey !== "none" && backgroundSettings.backgroundKey !== "original" && backgroundSettings.backgroundKey !== "white"
      ? getBackgroundPreset(backgroundSettings.backgroundKey).asset
      : null;
  const reset = () => { setStep(1); setPerson(null); setPersonSize(null); setGarment(null); setBackgroundSettings({ ...DEFAULT_BACKGROUND_SETTINGS, backgroundKey: "none" }); setResult(false); setResultImage(null); setStickerImage(null); setSavedOutfit(null); setGenerating(false); setGenerationProgress(0); };

  const generateTryOn = async () => {
    if (!person || !garment || generating) return;
    setGenerationProgress(8);
    setGenerationStage("正在准备图片");
    setGenerating(true);
    try {
      const created = await apiFetch<{ taskId?: string; status?: "SUCCEEDED"; image?: string }>("/api/try-on", { method: "POST", body: JSON.stringify({ person, garment, personWidth: personSize?.width, personHeight: personSize?.height }) });
      if (created.status === "SUCCEEDED" && created.image) {
        setGenerationProgress(100);
        setGenerationStage("正在生成专属形象");
        await new Promise((resolve) => window.setTimeout(resolve, 350));
        setResultImage(created.image);
        setGenerationStage("正在生成专属形象");
        const sticker = await apiFetch<{ sticker: string }>("/api/sticker", { method: "POST", body: JSON.stringify({ image: created.image }) });
        setStickerImage(sticker.sticker);
        if (user) { const saved = await apiFetch<{ outfit: import("@/lib/types").Look }>("/api/outfits", { method: "POST", body: JSON.stringify({ finalImage: created.image, stickerImage: sticker.sticker, source: "AI_TRY_ON", saveToWardrobe: true, personImage: person, garmentImage: garment, backgroundImage: backgroundSettings.backgroundImage, backgroundKey: backgroundSettings.backgroundKey, stickerScale: backgroundSettings.stickerScale }) }); setSavedOutfit(saved.outfit); }
        setResult(true);
        return;
      }
      if (!created.taskId) throw new Error("试衣服务没有返回生成结果，请稍后重试");
      setGenerationProgress((current) => Math.max(current, 24));
      setGenerationStage("正在分析人物与服装");
      for (let attempt = 0; attempt < 60; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 3000));
        const task = await apiFetch<{ status: "PROCESSING" | "SUCCEEDED" | "FAILED"; image?: string; error?: string }>(`/api/try-on/${created.taskId}`);
        if (task.status === "SUCCEEDED" && task.image) {
          setGenerationProgress(100); setGenerationStage("正在生成专属形象"); await new Promise((resolve) => window.setTimeout(resolve, 350));
          setResultImage(task.image);
          setGenerationStage("正在生成专属形象");
          const sticker = await apiFetch<{ sticker: string }>("/api/sticker", { method: "POST", body: JSON.stringify({ image: task.image }) });
          setStickerImage(sticker.sticker);
          if (user) { const saved = await apiFetch<{ outfit: import("@/lib/types").Look }>("/api/outfits", { method: "POST", body: JSON.stringify({ finalImage: task.image, stickerImage: sticker.sticker, source: "AI_TRY_ON", saveToWardrobe: true, personImage: person, garmentImage: garment, backgroundImage: backgroundSettings.backgroundImage, backgroundKey: backgroundSettings.backgroundKey, stickerScale: backgroundSettings.stickerScale }) }); setSavedOutfit(saved.outfit); }
          setResult(true); return;
        }
        if (task.status === "FAILED") throw new Error(task.error || "试衣生成失败，请更换照片后重试");
      }
      throw new Error("生成时间较长，请稍后重新尝试");
    } catch (error) { setUploadError(error instanceof Error ? error.message : "试衣生成失败，请稍后重试"); }
    finally { setGenerating(false); }
  };

  if (result && resultImage && stickerImage) return <ResultView resultImage={resultImage} stickerImage={stickerImage} person={person!} garment={garment!} initialBackground={backgroundSettings} initialSavedOutfit={savedOutfit} regenerate={reset} />;

  const preview = step === 1 ? person ?? "/default-person.png" : garment ?? "/default-garment.png";
  const kind: UploadKind = step === 1 ? "person" : step === 2 ? "garment" : "background";

  return (
    <><div className="try-layout">
      <section className={`workflow workflow-step-${step}`}>
        <div className="progress">
          {([1, 2, 3] as const).map((item, index) => (
            <span key={item} style={{ display: "contents" }}>
              <div className={`progress-step ${step >= item ? "done" : ""}`}><span>0{item}</span><b>{["人物", "服装", "背景"][index]}</b></div>
              {item < 3 && <div className="progress-line" />}
            </span>
          ))}
        </div>
        <div className="step-card">
          <div className="step-head"><div><h2>{current.title}</h2><p>{current.description}</p></div></div>
          {step < 3 ? <>
            <div className="single-preview guide-preview portrait-preview"><img src={preview} alt={`${current.title}参考图`} /></div>
            <div className="step-actions step-actions-split">
              <label className="secondary-btn upload-action"><input type="file" accept="image/*" onChange={(event) => void handleFile(event, kind)} />上传照片</label>
              <button className="primary-btn" disabled={!canContinue || generating} onClick={() => setStep((step + 1) as 2 | 3)}>下一步</button>
            </div>
          </> : <>
            <div className="single-preview guide-preview portrait-preview background-guide-preview">
              <img src={backgroundGuide} alt="背景示意图" />
            </div>
            <div className="step-actions step-actions-split background-step-controls">
              <BackgroundPicker value={backgroundSettings} onChange={setBackgroundSettings} onUpload={(event) => void handleFile(event, "background")} />
              <button className="primary-btn" disabled={generating} onClick={() => void generateTryOn()}>{generating ? "正在生成…" : "生成试衣效果"}</button>
            </div>
          </>}
        </div>
        <div className="workflow-foot"><span /><button onClick={reset}>重新开始</button></div>
      </section>
    </div>{generating && <div className="generating-overlay"><div className={`generating-images ${generatingBackground ? "count-3" : ""}`}><div className="generating-photo person"><img src={person!} alt="人物" /><span>人物</span></div><div className="generating-photo garment"><img src={garment!} alt="服装" /><span>服装</span></div>{generatingBackground && <div className="generating-photo background"><img src={generatingBackground} alt="背景" /><span>背景</span></div>}</div><b>{generationStage}</b><span className="generating-note">请不要关闭页面</span><div className="generating-progress" role="progressbar" aria-label="试衣生成进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={generationProgress}><i style={{ width: `${generationProgress}%` }} /></div><small>{generationProgress}%</small></div>}{uploadError && <UploadErrorModal message={uploadError} confirm={() => setUploadError("")} />}</>
  );
}
