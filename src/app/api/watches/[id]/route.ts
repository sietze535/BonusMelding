import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { watchedProducts } from "@/lib/db/schema";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();

  await db
    .delete(watchedProducts)
    .where(
      and(eq(watchedProducts.id, id), eq(watchedProducts.userId, user.id)),
    );

  return NextResponse.json({ ok: true });
}
