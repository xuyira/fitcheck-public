import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

const sqlitePath = process.env.SQLITE_PATH || "prisma/dev.db";
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl?.startsWith("postgresql://")) throw new Error("DATABASE_URL 必须是 PostgreSQL 连接串");
if (!existsSync(sqlitePath)) throw new Error(`找不到 SQLite 文件：${sqlitePath}`);

function rows(table) {
  const output = execFileSync("sqlite3", ["-json", sqlitePath, `SELECT * FROM ${table};`], { encoding: "utf8" });
  return output.trim() ? JSON.parse(output) : [];
}
function sqlValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}
function insert(table, columns, values) {
  if (!values.length) return "";
  const names = columns.map((column) => `"${column}"`).join(",");
  const records = values.map((row) => `(${columns.map((column) => sqlValue(row[column])).join(",")})`).join(",\n");
  return `INSERT INTO "${table}" (${names}) VALUES\n${records}\nON CONFLICT DO NOTHING;`;
}

const sql = [
  insert("User", ["id", "email", "passwordHash", "createdAt", "updatedAt"], rows("User")),
  insert("Session", ["id", "tokenHash", "userId", "expiresAt", "createdAt"], rows("Session")),
  insert("Outfit", ["id", "userId", "source", "finalImage", "stickerImage", "personImage", "garmentImage", "backgroundImage", "backgroundKey", "stickerScale", "stickerOffsetX", "stickerOffsetY", "createdAt", "updatedAt"], rows("Outfit")),
  insert("CalendarEntry", ["id", "userId", "outfitId", "date", "backgroundImage", "backgroundKey", "stickerScale", "stickerOffsetX", "stickerOffsetY", "createdAt"], rows("CalendarEntry")),
  insert("TryOnTask", ["id", "userId", "provider", "providerTaskId", "status", "errorMessage", "createdAt", "updatedAt"], rows("TryOnTask")),
].filter(Boolean).join("\n\n");

execFileSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-q"], { input: sql, stdio: ["pipe", "inherit", "inherit"] });
console.log("SQLite 数据已导入 PostgreSQL");
