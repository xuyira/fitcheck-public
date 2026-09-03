-- Store a transparent outfit sticker once. Background choice is metadata, not
-- a second flattened image for each preset scene.
ALTER TABLE "Outfit" ADD COLUMN "stickerImage" TEXT;
ALTER TABLE "Outfit" ADD COLUMN "backgroundKey" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "Outfit" ADD COLUMN "stickerScale" REAL NOT NULL DEFAULT 1;

-- Calendar entries snapshot display settings so an outfit can be reused on
-- multiple days with independent backgrounds and scales.
ALTER TABLE "CalendarEntry" ADD COLUMN "backgroundImage" TEXT;
ALTER TABLE "CalendarEntry" ADD COLUMN "backgroundKey" TEXT NOT NULL DEFAULT 'default';
ALTER TABLE "CalendarEntry" ADD COLUMN "stickerScale" REAL NOT NULL DEFAULT 1;
