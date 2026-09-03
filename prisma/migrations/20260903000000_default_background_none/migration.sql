-- New records without an explicit background should have no background.
UPDATE "Outfit" SET "backgroundKey" = 'none' WHERE "backgroundKey" = 'default';
UPDATE "CalendarEntry" SET "backgroundKey" = 'none' WHERE "backgroundKey" = 'default';
