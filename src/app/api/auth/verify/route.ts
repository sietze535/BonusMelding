import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { SESSION_COOKIE, appUrl } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(appUrl("/?error=missing_token"));
  }

  try {
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.manageToken, token))
      .limit(1);

    if (!user) {
      return NextResponse.redirect(appUrl("/?error=invalid_token"));
    }

    if (!user.emailVerifiedAt) {
      await db
        .update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(eq(users.id, user.id));
    }

    const response = NextResponse.redirect(appUrl("/dashboard"));
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
    return response;
  } catch (error) {
    console.error("verify error", error);
    return NextResponse.redirect(appUrl("/?error=server"));
  }
}
