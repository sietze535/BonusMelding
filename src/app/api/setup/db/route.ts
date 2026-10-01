import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export const maxDuration = 30;

function authorize(request: Request): boolean {
  const auth = request.headers.get("authorization");
  const secrets = [process.env.CRON_SECRET, process.env.SETUP_SECRET].filter(
    Boolean,
  ) as string[];
  return secrets.some((secret) => auth === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  return POST(request);
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL UNIQUE,
        email_verified_at timestamptz,
        manage_token text NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS watched_products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        supermarket text NOT NULL DEFAULT 'ah',
        external_product_id text NOT NULL,
        name text NOT NULL,
        image_url text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS watched_user_product_idx
      ON watched_products (user_id, supermarket, external_product_id);
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bonus_snapshots (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        supermarket text NOT NULL,
        week_key text NOT NULL,
        product_ids jsonb NOT NULL,
        fetched_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS bonus_snapshot_week_idx
      ON bonus_snapshots (supermarket, week_key);
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS alert_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        watched_product_id uuid NOT NULL REFERENCES watched_products(id) ON DELETE CASCADE,
        week_key text NOT NULL,
        sent_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS alert_user_product_week_idx
      ON alert_logs (user_id, watched_product_id, week_key);
    `);

    return NextResponse.json({ ok: true, message: "Schema ready" });
  } catch (error) {
    console.error("setup/db error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Setup failed" },
      { status: 500 },
    );
  }
}
