import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, normalizeEmail } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    const user = await db.user.findUnique({ where: { email } });
    if (!user || !await verifyPassword(password, user.passwordHash)) return NextResponse.json({ error: "邮箱或密码不正确" }, { status: 401 });
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (error) { return apiError(error); }
}
