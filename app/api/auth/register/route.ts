import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, normalizeEmail, validEmail } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    if (!validEmail(email)) return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "密码至少需要8个字符" }, { status: 400 });
    if (await db.user.findUnique({ where: { email } })) return NextResponse.json({ error: "该邮箱已经注册" }, { status: 409 });
    const user = await db.user.create({ data: { email, passwordHash: await hashPassword(password) }, select: { id: true, email: true } });
    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) { return apiError(error); }
}
