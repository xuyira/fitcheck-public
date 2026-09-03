import { NextResponse } from "next/server";
import { createSession, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError } from "@/lib/http";

const DEMO_EMAIL = "demo@163.com";

export async function POST() {
  try {
    const passwordHash = await hashPassword(`demo-${process.env.SESSION_SECRET ?? "fitcheck"}`);
    const user = await db.user.upsert({
      where: { email: DEMO_EMAIL },
      update: {},
      create: { email: DEMO_EMAIL, passwordHash },
    });
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (error) { return apiError(error); }
}
