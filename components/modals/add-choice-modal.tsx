"use client";

import type { ChangeEvent } from "react";
import { ChevronRight, ImagePlus, Shirt, Sparkles, X } from "lucide-react";

interface AddChoiceModalProps {
  close: () => void;
  startTry: () => void;
  uploadImage: (event: ChangeEvent<HTMLInputElement>) => void;
  chooseWardrobe?: () => void;
}

export function AddChoiceModal({ close, startTry, uploadImage, chooseWardrobe }: AddChoiceModalProps) {
  return (
    <div className="overlay">
      <div className="choice-modal">
        <button className="icon-close" aria-label="关闭" onClick={close}><X size={19} /></button>
        <h2>添加穿搭</h2>
        <label className="choice-item">
          <input type="file" accept="image/*" onChange={uploadImage} />
          <ImagePlus size={22} />
          <div><b>上传图片</b><small>从本地选择一张图片</small></div>
          <ChevronRight size={17} />
        </label>
        {chooseWardrobe && <button className="choice-item" onClick={chooseWardrobe}><Shirt size={22} /><div><b>从衣橱中选择</b><small>使用已保存的穿搭</small></div><ChevronRight size={17} /></button>}
        <button className="choice-item" onClick={startTry}>
          <Sparkles size={22} />
          <div><b>开始试衣</b><small>上传人物、服装和背景</small></div>
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
}
