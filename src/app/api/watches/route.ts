import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { watchedProducts } from "@/lib/db/schema";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const db = getDb();
  const items = await db
    .select()
    .from(watchedProducts)
    .where(eq(watchedProducts.userId, user.id))
    .orderBy(desc(watchedProducts.createdAt));

  return NextResponse.json({ watches: items });
}

const createSchema = z.object({
  supermarket: z.enum(["ah"]).default("ah"),
  externalProductId: z.string().min(1).max(64),
  name: z.string().min(1).max(300),
  imageUrl: z.union([z.string().url(), z.literal(""), z.null()]).optional(),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige productdata" }, { status: 400 });
  }

  const db = getDb();
  const data = parsed.data;

  const [existing] = await db
    .select()
    .from(watchedProducts)
    .where(
      and(
        eq(watchedProducts.userId, user.id),
        eq(watchedProducts.supermarket, data.supermarket),
        eq(watchedProducts.externalProductId, data.externalProductId),
      ),
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ watch: existing });
  }

  const [watch] = await db
    .insert(watchedProducts)
    .values({
      userId: user.id,
      supermarket: data.supermarket,
      externalProductId: data.externalProductId,
      name: data.name,
      imageUrl: data.imageUrl ? data.imageUrl : null,
    })
    .returning();

  return NextResponse.json({ watch }, { status: 201 });
}
