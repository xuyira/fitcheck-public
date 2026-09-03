import type { BackgroundKey } from "@/lib/backgrounds";

export type AppPage = "try" | "wardrobe" | "calendar";
export type UploadKind = "person" | "garment" | "background";
export type ModalName = "login" | "add" | "delete" | null;

export interface Look {
  id: number | string;
  title?: string;
  date: string;
  image: string;
  originalImage?: string;
  sticker?: string;
  person?: string | null;
  garment?: string | null;
  background?: string | null;
  backgroundKey?: BackgroundKey;
  stickerScale?: number;
  stickerOffsetX?: number;
  stickerOffsetY?: number;
  source?: "LOCAL_UPLOAD" | "AI_TRY_ON";
  generationStatus?: "GENERATING" | "READY";
  createdAt?: string;
}

export interface SessionUser { id: string; email: string }
export interface CalendarItem {
  id: string;
  date: string;
  outfit: Look;
  background?: string | null;
  backgroundKey?: BackgroundKey;
  stickerScale?: number;
  stickerOffsetX?: number;
  stickerOffsetY?: number;
}
