import { redirect } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { DashboardClient } from "@/components/DashboardClient";
import { LogoutButton } from "@/components/LogoutButton";
import { getSessionUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { watchedProducts } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/");
  }

  const db = getDb();
  const watches = await db
    .select()
    .from(watchedProducts)
    .where(eq(watchedProducts.userId, user.id))
    .orderBy(desc(watchedProducts.createdAt));

  return (
    <main className="shell">
      <header className="dash-top">
        <h1 className="brand-sm">BonusMelding</h1>
        <p className="muted" style={{ margin: 0 }}>
          {user.email} · <LogoutButton />
        </p>
      </header>
      <DashboardClient initialWatches={watches} />
    </main>
  );
}
