import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  alertLogs,
  bonusSnapshots,
  users,
  watchedProducts,
} from "@/lib/db/schema";
import { sendBonusDigestEmail } from "@/lib/email";
import { getAdapter } from "@/lib/supermarkets";
import { getBonusWeekKey } from "@/lib/week";

export const maxDuration = 60;

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const weekKey = getBonusWeekKey();
    const adapter = getAdapter("ah");
    const bonusProducts = await adapter.fetchCurrentBonus();
    const bonusIds = new Set(bonusProducts.map((p) => p.id));
    const bonusIdList = [...bonusIds];

    const db = getDb();

    await db
      .insert(bonusSnapshots)
      .values({
        supermarket: "ah",
        weekKey,
        productIds: bonusIdList,
      })
      .onConflictDoUpdate({
        target: [bonusSnapshots.supermarket, bonusSnapshots.weekKey],
        set: {
          productIds: bonusIdList,
          fetchedAt: new Date(),
        },
      });

    if (bonusIdList.length === 0) {
      return NextResponse.json({
        ok: true,
        weekKey,
        bonusCount: 0,
        emailsSent: 0,
        warning: "No bonus products found",
      });
    }

    const watches = await db
      .select()
      .from(watchedProducts)
      .where(
        and(
          eq(watchedProducts.supermarket, "ah"),
          inArray(watchedProducts.externalProductId, bonusIdList),
        ),
      );

    const byUser = new Map<string, typeof watches>();
    for (const watch of watches) {
      const list = byUser.get(watch.userId) ?? [];
      list.push(watch);
      byUser.set(watch.userId, list);
    }

    let emailsSent = 0;

    for (const [userId, userWatches] of byUser) {
      const already = await db
        .select()
        .from(alertLogs)
        .where(
          and(
            eq(alertLogs.userId, userId),
            eq(alertLogs.weekKey, weekKey),
            inArray(
              alertLogs.watchedProductId,
              userWatches.map((w) => w.id),
            ),
          ),
        );

      const alreadyIds = new Set(already.map((a) => a.watchedProductId));
      const fresh = userWatches.filter((w) => !alreadyIds.has(w.id));
      if (fresh.length === 0) continue;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!user) continue;

      await sendBonusDigestEmail(user.email, user.manageToken, fresh);

      await db.insert(alertLogs).values(
        fresh.map((w) => ({
          userId,
          watchedProductId: w.id,
          weekKey,
        })),
      );

      emailsSent += 1;
    }

    return NextResponse.json({
      ok: true,
      weekKey,
      bonusCount: bonusIdList.length,
      matchCount: watches.length,
      emailsSent,
    });
  } catch (error) {
    console.error("cron check-bonus error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron failed" },
      { status: 500 },
    );
  }
}
