export const BACKGROUND_KEYS = [
  "none",
  "original",
  "white",
  "default",
  "beach",
  "grassland",
  "cafe",
  "library",
  "gallery",
  "city-night",
  "hiking-trail",
  "chinese-garden",
  "greenhouse",
  "custom",
] as const;

export type BackgroundKey = (typeof BACKGROUND_KEYS)[number];

export interface BackgroundPreset {
  key: BackgroundKey;
  label: string;
  description: string;
  /**
   * This is intentionally only a visual fallback for the pre-generated scene.
   * When the approved portrait assets are added under public/backgrounds, set
   * `asset` here and every picker/view will use the same image automatically.
   */
  fallback: string;
  asset?: string;
}

export interface BackgroundSettings {
  backgroundKey: BackgroundKey;
  backgroundImage?: string | null;
  stickerScale: number;
  stickerOffsetX?: number;
  stickerOffsetY?: number;
}

export const BACKGROUND_PRESETS: readonly BackgroundPreset[] = [
  { key: "none", label: "无背景", description: "仅显示透明贴纸", fallback: "transparent" },
  { key: "original", label: "原始背景", description: "保留原始背景", fallback: "repeating-conic-gradient(#f7f3ed 0% 25%, #ece6dc 0% 50%) 50% / 18px 18px" },
  { key: "white", label: "纯白背景", description: "使用纯白色背景", fallback: "#ffffff", asset: "/backgrounds/纯白背景.svg" },
  { key: "default", label: "梧桐街景", description: "上海梧桐树下的安静街道", fallback: "#849978", asset: "/backgrounds/梧桐街景.png" },
  { key: "beach", label: "海边", description: "晴天的细沙海滩与海浪", fallback: "#8fc8e6", asset: "/backgrounds/海边.png" },
  { key: "grassland", label: "草原", description: "开阔草原与远处低山", fallback: "#a2b96b", asset: "/backgrounds/草原.png" },
  { key: "cafe", label: "咖啡店", description: "街角咖啡店的窗边座位", fallback: "#9d6b45", asset: "/backgrounds/咖啡店.png" },
  { key: "library", label: "图书馆", description: "木质书架与安静阅读空间", fallback: "#68422d", asset: "/backgrounds/图书馆.png" },
  { key: "gallery", label: "美术馆", description: "简洁明亮的艺术展厅", fallback: "#dedad2", asset: "/backgrounds/美术馆.png" },
  { key: "city-night", label: "都市夜景", description: "城市夜晚的暖色灯火", fallback: "#573a71", asset: "/backgrounds/都市夜景.png" },
  { key: "hiking-trail", label: "山野徒步", description: "山间徒步步道与层叠山景", fallback: "#8dabb2", asset: "/backgrounds/山野徒步.png" },
  { key: "chinese-garden", label: "古典园林", description: "石径、白墙与绿植相映的园林", fallback: "#9aab83", asset: "/backgrounds/古典园林.png" },
  { key: "greenhouse", label: "浪漫花海", description: "盛放花朵与自然光线交织的花海", fallback: "#82a86f", asset: "/backgrounds/浪漫花海.png" },
] as const;

export const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = {
  backgroundKey: "none",
  backgroundImage: null,
  stickerScale: 1,
};

export const BACKGROUND_IMAGE_SIZE = "1024x1536";

export function getBackgroundPreset(key: BackgroundKey | string | null | undefined) {
  return BACKGROUND_PRESETS.find((preset) => preset.key === key) ?? BACKGROUND_PRESETS[1];
}

export function normalizeBackgroundKey(value: unknown): BackgroundKey {
  return BACKGROUND_KEYS.includes(value as BackgroundKey) ? value as BackgroundKey : "none";
}

export function normalizeStickerScale(value: unknown) {
  const scale = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(scale)) return 1;
  return Math.min(1.4, Math.max(0.6, Math.round(scale * 100) / 100));
}

export function backgroundGenerationPrompt(preset: BackgroundPreset) {
  return [
    `Photorealistic Chinese fashion background for a virtual fitting room: ${preset.description}.`,
    "Authentic everyday China, natural architectural details and textures, vertical 2:3 composition, no people, no mannequins, no clothing, no text, no logos.",
    "Keep an uncluttered central standing area with natural perspective and lighting so a full-body outfit sticker can be composited convincingly.",
  ].join(" ");
}
