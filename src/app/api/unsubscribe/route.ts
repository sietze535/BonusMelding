import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users, watchedProducts } from "@/lib/db/schema";
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

    await db.delete(watchedProducts).where(eq(watchedProducts.userId, user.id));
    await db.delete(users).where(eq(users.id, user.id));

    const response = NextResponse.redirect(appUrl("/?unsubscribed=1"));
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error) {
    console.error("unsubscribe error", error);
    return NextResponse.redirect(appUrl("/?error=server"));
  }
}
