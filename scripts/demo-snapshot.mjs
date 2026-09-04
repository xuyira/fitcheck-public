import fs from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const DEMO_EMAIL = "demo@163.com";
const snapshotDir = process.env.DEMO_SNAPSHOT_DIR || path.resolve(process.cwd(), ".demo-snapshots");
const name = process.argv[2] || "default";
const file = path.join(snapshotDir, `${name}.json`);
const db = new PrismaClient();

const reviveDates = (value, keys) => Object.fromEntries(Object.entries(value).map(([key, item]) => [key, keys.includes(key) && typeof item === "string" ? new Date(item) : item]));

async function save() {
  const user = await db.user.findUnique({ where: { email: DEMO_EMAIL }, select: { id: true, email: true, passwordHash: true, createdAt: true, updatedAt: true } });
  if (!user) throw new Error("演示账号不存在，请先通过网站进入演示账号");
  const [outfits, calendar, tryOnTasks] = await Promise.all([
    db.outfit.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    db.calendarEntry.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } }),
    db.tryOnTask.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
  ]);
  const snapshot = { version: 1, savedAt: new Date().toISOString(), user, outfits, calendar, tryOnTasks };
  await fs.mkdir(snapshotDir, { recursive: true });
  const temp = `${file}.tmp-${process.pid}`;
  await fs.writeFile(temp, JSON.stringify(snapshot), "utf8");
  await fs.rename(temp, file);
  await fs.chmod(file, 0o600);
  console.log(`已保存演示状态: ${name}`);
}

async function restore() {
  const raw = JSON.parse(await fs.readFile(file, "utf8"));
  if (raw.version !== 1 || !raw.user?.id || raw.user.email !== DEMO_EMAIL) throw new Error("快照格式无效或不是演示账号快照");
  await db.$transaction(async (tx) => {
    const user = await tx.user.upsert({ where: { email: DEMO_EMAIL }, update: { passwordHash: raw.user.passwordHash, updatedAt: new Date(raw.user.updatedAt) }, create: reviveDates(raw.user, ["createdAt", "updatedAt"]) });
    await tx.calendarEntry.deleteMany({ where: { userId: user.id } });
    await tx.tryOnTask.deleteMany({ where: { userId: user.id } });
    await tx.outfit.deleteMany({ where: { userId: user.id } });
    for (const outfit of raw.outfits || []) await tx.outfit.create({ data: { ...reviveDates(outfit, ["createdAt", "updatedAt"]), userId: user.id } });
    for (const entry of raw.calendar || []) await tx.calendarEntry.create({ data: { ...reviveDates(entry, ["createdAt"]), userId: user.id } });
    for (const task of raw.tryOnTasks || []) await tx.tryOnTask.create({ data: { ...reviveDates(task, ["createdAt", "updatedAt"]), userId: user.id } });
  });
  console.log(`已恢复演示状态: ${name}`);
}

const command = process.env.DEMO_SNAPSHOT_COMMAND || "save";
try { if (command === "restore") await restore(); else await save(); }
catch (error) { console.error(error instanceof Error ? error.message : "演示状态操作失败"); process.exitCode = 1; }
finally { await db.$disconnect(); }
